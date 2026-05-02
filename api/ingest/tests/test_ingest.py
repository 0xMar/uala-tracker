"""Tests for api/ingest."""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

# Env vars must be set before importing the app
import os
os.environ.setdefault("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SECRET_KEY", "test-service-role-key")

from api.ingest.index import app, _jwks_cache
import api.ingest.index as ingest_module

client = TestClient(app)

PDF_PATH = Path("data/raw/ResumenDeCuentaTarjetaDeCredito_202603.pdf")

# A minimal valid HS256 JWT signed with a known secret for testing
import jwt as _jwt  # PyJWT — only used to mint test tokens

TEST_USER_ID = "00000000-0000-0000-0000-000000000001"
TEST_JWKS = {"keys": []}  # JWKS is mocked — actual key not needed for HS256 path

def _make_token(sub: str = TEST_USER_ID, expired: bool = False) -> str:
    import time
    exp = int(time.time()) + (-10 if expired else 3600)
    return _jwt.encode(
        {"sub": sub, "aud": "authenticated", "exp": exp},
        "test-jwt-secret",
        algorithm="HS256",
    )


@pytest.fixture(autouse=True)
def mock_jwks(monkeypatch):
    """Patch _get_jwks to return a test JWKS and patch jwt.decode to use HS256 test secret."""
    async def fake_get_jwks():
        return TEST_JWKS

    monkeypatch.setattr(ingest_module, "_get_jwks", fake_get_jwks)
    monkeypatch.setattr(ingest_module, "_jwks_cache", None)

    # Patch jose jwt.decode to use our test secret
    import jwt as pyjwt
    from jose import JWTError as JoseJWTError

    def fake_decode(token, *args, **kwargs):
        try:
            return pyjwt.decode(token, "test-jwt-secret", algorithms=["HS256"], audience="authenticated")
        except Exception as e:
            raise JoseJWTError(str(e)) from e

    monkeypatch.setattr(ingest_module.jwt, "decode", fake_decode)


# --- Auth ---

def test_missing_authorization_header():
    response = client.post("/api/ingest", files={"file": ("x.pdf", b"%PDF-fake", "application/pdf")})
    assert response.status_code == 422  # FastAPI missing required header


def test_invalid_authorization_format():
    response = client.post(
        "/api/ingest",
        headers={"Authorization": "Basic abc123"},
        files={"file": ("x.pdf", b"%PDF-fake", "application/pdf")},
    )
    assert response.status_code == 401
    assert "Invalid authorization header" in response.json()["detail"]


def test_invalid_jwt():
    response = client.post(
        "/api/ingest",
        headers={"Authorization": "Bearer not.a.valid.token"},
        files={"file": ("x.pdf", b"%PDF-fake", "application/pdf")},
    )
    assert response.status_code == 401


# --- File validation ---

def test_rejects_non_pdf_content_type():
    token = _make_token()
    response = client.post(
        "/api/ingest",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("file.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 400
    assert "PDF" in response.json()["detail"]


def test_rejects_invalid_pdf_magic_bytes():
    token = _make_token()
    response = client.post(
        "/api/ingest",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("file.pdf", b"not a real pdf", "application/pdf")},
    )
    assert response.status_code == 400


def test_rejects_non_uala_pdf():
    token = _make_token()
    fake_pdf = (
        b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj "
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj "
        b"xref\n0 3\ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n0\n%%EOF"
    )
    response = client.post(
        "/api/ingest",
        headers={"Authorization": f"Bearer {token}"},
        files={"file": ("other.pdf", fake_pdf, "application/pdf")},
    )
    assert response.status_code == 422


# --- Happy path ---

@pytest.mark.skipif(not PDF_PATH.exists(), reason="No PDF fixture available")
def test_ingest_success_with_real_pdf():
    """Full happy path: valid JWT + real Ualá PDF → 201 with statement_id and period."""
    token = _make_token()

    # Mock Supabase REST calls
    mock_response_stmt = MagicMock()
    mock_response_stmt.status_code = 201
    mock_response_stmt.json.return_value = [{"id": "stmt-uuid-1234"}]

    mock_response_delete = MagicMock()
    mock_response_delete.status_code = 200

    mock_response_txns = MagicMock()
    mock_response_txns.status_code = 201

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(side_effect=[mock_response_stmt, mock_response_txns])
    mock_client.delete = AsyncMock(return_value=mock_response_delete)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("api.ingest.index.httpx.AsyncClient", return_value=mock_client):
        response = client.post(
            "/api/ingest",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("statement.pdf", PDF_PATH.read_bytes(), "application/pdf")},
        )

    assert response.status_code == 201
    data = response.json()
    assert data["statement_id"] == "stmt-uuid-1234"
    assert data["period"] == "2026-03"
    assert data["transactions"] > 0


@pytest.mark.skipif(not PDF_PATH.exists(), reason="No PDF fixture available")
def test_ingest_passes_user_id_to_supabase():
    """user_id extracted from JWT must be forwarded to Supabase INSERT."""
    token = _make_token(sub=TEST_USER_ID)

    captured = {}

    mock_response_stmt = MagicMock()
    mock_response_stmt.status_code = 201
    mock_response_stmt.json.return_value = [{"id": "stmt-uuid-1234"}]

    mock_response_delete = MagicMock()
    mock_response_delete.status_code = 200

    mock_response_txns = MagicMock()
    mock_response_txns.status_code = 201

    async def capture_post(url, json=None, headers=None):
        if "statements" in url:
            captured["user_id"] = json.get("user_id")
        return mock_response_stmt if "statements" in url else mock_response_txns

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(side_effect=capture_post)
    mock_client.delete = AsyncMock(return_value=mock_response_delete)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("api.ingest.index.httpx.AsyncClient", return_value=mock_client):
        client.post(
            "/api/ingest",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("statement.pdf", PDF_PATH.read_bytes(), "application/pdf")},
        )

    assert captured["user_id"] == TEST_USER_ID


@pytest.mark.skipif(not PDF_PATH.exists(), reason="No PDF fixture available")
def test_ingest_returns_502_on_supabase_error():
    """If Supabase returns an error, the endpoint must return 502."""
    token = _make_token()

    mock_response_stmt = MagicMock()
    mock_response_stmt.status_code = 500
    mock_response_stmt.text = "Internal Server Error"

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response_stmt)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("api.ingest.index.httpx.AsyncClient", return_value=mock_client):
        response = client.post(
            "/api/ingest",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": ("statement.pdf", PDF_PATH.read_bytes(), "application/pdf")},
        )

    assert response.status_code == 502
