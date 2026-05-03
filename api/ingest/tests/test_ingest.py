"""Tests for api/ingest."""
from __future__ import annotations

import hashlib
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

from api.ingest.index import app

client = TestClient(app)

PDF_PATH = Path("data/raw/ResumenDeCuentaTarjetaDeCredito_202603.pdf")

TEST_USER_ID = "00000000-0000-0000-0000-000000000001"
TEST_API_KEY = "uala_test_key_1234567890abcdef"
TEST_KEY_HASH = hashlib.sha256(TEST_API_KEY.encode()).hexdigest()


# --- Auth ---

def test_missing_api_key_header():
    response = client.post("/api/ingest", files={"file": ("x.pdf", b"%PDF-fake", "application/pdf")})
    assert response.status_code == 422  # FastAPI missing required header


def test_invalid_api_key_format():
    response = client.post(
        "/api/ingest",
        headers={"X-API-Key": "invalid_format"},
        files={"file": ("x.pdf", b"%PDF-fake", "application/pdf")},
    )
    assert response.status_code == 401
    assert "Invalid API key format" in response.json()["detail"]


def test_api_key_not_found():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = []  # No keys found

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("api.ingest.index.httpx.AsyncClient", return_value=mock_client):
        response = client.post(
            "/api/ingest",
            headers={"X-API-Key": TEST_API_KEY},
            files={"file": ("x.pdf", b"%PDF-fake", "application/pdf")},
        )

    assert response.status_code == 401
    assert "Invalid or revoked" in response.json()["detail"]


# --- File validation ---

def test_rejects_non_pdf_content_type():
    mock_response_get = MagicMock()
    mock_response_get.status_code = 200
    mock_response_get.json.return_value = [{"user_id": TEST_USER_ID, "id": "key-id-123"}]

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response_get)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("api.ingest.index.httpx.AsyncClient", return_value=mock_client):
        response = client.post(
            "/api/ingest",
            headers={"X-API-Key": TEST_API_KEY},
            files={"file": ("file.txt", b"hello", "text/plain")},
        )

    assert response.status_code == 400
    assert "PDF" in response.json()["detail"]


def test_rejects_invalid_pdf_magic_bytes():
    mock_response_get = MagicMock()
    mock_response_get.status_code = 200
    mock_response_get.json.return_value = [{"user_id": TEST_USER_ID, "id": "key-id-123"}]

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response_get)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("api.ingest.index.httpx.AsyncClient", return_value=mock_client):
        response = client.post(
            "/api/ingest",
            headers={"X-API-Key": TEST_API_KEY},
            files={"file": ("file.pdf", b"not a real pdf", "application/pdf")},
        )

    assert response.status_code == 400


def test_rejects_non_uala_pdf():
    fake_pdf = (
        b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj "
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj "
        b"xref\n0 3\ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n0\n%%EOF"
    )

    mock_response_get = MagicMock()
    mock_response_get.status_code = 200
    mock_response_get.json.return_value = [{"user_id": TEST_USER_ID, "id": "key-id-123"}]

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response_get)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("api.ingest.index.httpx.AsyncClient", return_value=mock_client):
        response = client.post(
            "/api/ingest",
            headers={"X-API-Key": TEST_API_KEY},
            files={"file": ("other.pdf", fake_pdf, "application/pdf")},
        )

    assert response.status_code == 422


# --- Happy path ---

@pytest.mark.skipif(not PDF_PATH.exists(), reason="No PDF fixture available")
def test_ingest_success_with_real_pdf():
    """Full happy path: valid API key + real Ualá PDF → 201 with statement_id and period."""
    # Mock API key validation
    mock_response_get = MagicMock()
    mock_response_get.status_code = 200
    mock_response_get.json.return_value = [{"user_id": TEST_USER_ID, "id": "key-id-123"}]

    mock_response_patch = MagicMock()
    mock_response_patch.status_code = 200

    # Mock Supabase statement/transaction inserts
    mock_response_stmt = MagicMock()
    mock_response_stmt.status_code = 201
    mock_response_stmt.json.return_value = [{"id": "stmt-uuid-1234"}]

    mock_response_delete = MagicMock()
    mock_response_delete.status_code = 200

    mock_response_txns = MagicMock()
    mock_response_txns.status_code = 201

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response_get)
    mock_client.patch = AsyncMock(return_value=mock_response_patch)
    mock_client.post = AsyncMock(side_effect=[mock_response_stmt, mock_response_txns])
    mock_client.delete = AsyncMock(return_value=mock_response_delete)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("api.ingest.index.httpx.AsyncClient", return_value=mock_client):
        response = client.post(
            "/api/ingest",
            headers={"X-API-Key": TEST_API_KEY},
            files={"file": ("statement.pdf", PDF_PATH.read_bytes(), "application/pdf")},
        )

    assert response.status_code == 201
    data = response.json()
    assert data["statement_id"] == "stmt-uuid-1234"
    assert data["period"] == "2026-03"
    assert data["transactions"] > 0


@pytest.mark.skipif(not PDF_PATH.exists(), reason="No PDF fixture available")
def test_ingest_passes_user_id_to_supabase():
    """user_id extracted from API key must be forwarded to Supabase INSERT."""
    captured = {}

    # Mock API key validation
    mock_response_get = MagicMock()
    mock_response_get.status_code = 200
    mock_response_get.json.return_value = [{"user_id": TEST_USER_ID, "id": "key-id-123"}]

    mock_response_patch = MagicMock()
    mock_response_patch.status_code = 200

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
    mock_client.get = AsyncMock(return_value=mock_response_get)
    mock_client.patch = AsyncMock(return_value=mock_response_patch)
    mock_client.post = AsyncMock(side_effect=capture_post)
    mock_client.delete = AsyncMock(return_value=mock_response_delete)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("api.ingest.index.httpx.AsyncClient", return_value=mock_client):
        client.post(
            "/api/ingest",
            headers={"X-API-Key": TEST_API_KEY},
            files={"file": ("statement.pdf", PDF_PATH.read_bytes(), "application/pdf")},
        )

    assert captured["user_id"] == TEST_USER_ID


@pytest.mark.skipif(not PDF_PATH.exists(), reason="No PDF fixture available")
def test_ingest_returns_502_on_supabase_error():
    """If Supabase returns an error, the endpoint must return 502."""
    # Mock API key validation
    mock_response_get = MagicMock()
    mock_response_get.status_code = 200
    mock_response_get.json.return_value = [{"user_id": TEST_USER_ID, "id": "key-id-123"}]

    mock_response_patch = MagicMock()
    mock_response_patch.status_code = 200

    mock_response_stmt = MagicMock()
    mock_response_stmt.status_code = 500
    mock_response_stmt.text = "Internal Server Error"

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_response_get)
    mock_client.patch = AsyncMock(return_value=mock_response_patch)
    mock_client.post = AsyncMock(return_value=mock_response_stmt)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("api.ingest.index.httpx.AsyncClient", return_value=mock_client):
        response = client.post(
            "/api/ingest",
            headers={"X-API-Key": TEST_API_KEY},
            files={"file": ("statement.pdf", PDF_PATH.read_bytes(), "application/pdf")},
        )

    assert response.status_code == 502
