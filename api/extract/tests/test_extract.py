"""Tests for api/extract — TDD strict mode."""
from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Allow running from project root
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from api.extract.index import app
from api.extract.process import extract, is_uala_pdf

client = TestClient(app)

PDF_PATH = Path("data/raw/ResumenDeCuentaTarjetaDeCredito_202603.pdf")


# --- Unit: is_uala_pdf ---

def test_is_uala_pdf_true():
    assert PDF_PATH.exists(), "Put a Ualá PDF in data/raw/ to run integration tests"
    assert is_uala_pdf(PDF_PATH.read_bytes()) is True


def test_is_uala_pdf_false():
    fake_pdf = b"%PDF-1.4 fake content without the identifier"
    assert is_uala_pdf(fake_pdf) is False


# --- Unit: extract ---

def test_extract_returns_correct_structure():
    pdf_bytes = PDF_PATH.read_bytes()
    result = extract(pdf_bytes)

    assert result.statement.period == "2026-03"
    assert result.statement.total_debt_ars is not None
    assert result.statement.minimum_payment is not None
    assert result.statement.previous_balance is not None
    assert result.statement.due_date is not None
    assert result.statement.close_date is not None
    assert len(result.transactions) > 0


def test_extract_transactions_have_required_fields():
    pdf_bytes = PDF_PATH.read_bytes()
    result = extract(pdf_bytes)

    for txn in result.transactions:
        assert txn.transaction_date is not None
        assert txn.merchant
        assert txn.amount_ars != 0
        assert txn.type in ("CONSUMO", "PAGO", "IMPUESTO")
        assert txn.installment_current >= 1
        assert txn.installments_total >= 1


def test_extract_reconciliation_ok():
    pdf_bytes = PDF_PATH.read_bytes()
    result = extract(pdf_bytes)
    assert result.reconciliation["ok"] is True


# --- Integration: POST /api/extract ---

def test_endpoint_success():
    pdf_bytes = PDF_PATH.read_bytes()
    response = client.post(
        "/api/extract",
        files={"file": ("statement.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    data = response.json()
    assert "statement" in data
    assert "transactions" in data
    assert data["statement"]["period"] == "2026-03"


def test_endpoint_rejects_non_pdf():
    response = client.post(
        "/api/extract",
        files={"file": ("file.txt", b"not a pdf", "text/plain")},
    )
    assert response.status_code == 400


def test_endpoint_rejects_non_uala_pdf():
    # Minimal valid PDF bytes that won't contain "Ualá Bank S.A.U."
    fake_pdf = (
        b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj "
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj "
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj "
        b"xref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n0\n%%EOF"
    )
    response = client.post(
        "/api/extract",
        files={"file": ("other.pdf", fake_pdf, "application/pdf")},
    )
    assert response.status_code == 422
