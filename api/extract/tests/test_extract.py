"""Tests for api/extract — TDD strict mode."""
from __future__ import annotations

import sys
from pathlib import Path

import os

import pytest
from fastapi.testclient import TestClient

# Allow running from project root
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from api.extract.index import app
from api.extract.process import extract, is_uala_pdf, _parse_p1_tasas, _parse_legal_tasas

client = TestClient(app)

PDF_PATH = Path("data/raw/ResumenDeCuentaTarjetaDeCredito_202603.pdf")

# Set a test secret so the endpoint auth check passes (only if not already set)
TEST_API_KEY = os.environ.setdefault("EXTRACT_API_SECRET", "test-secret")
API_HEADERS = {"X-API-Key": TEST_API_KEY}


# --- Unit: is_uala_pdf ---

def test_is_uala_pdf_true():
    assert PDF_PATH.exists(), "Put a Ualá PDF in data/raw/ to run integration tests"
    assert is_uala_pdf(PDF_PATH.read_bytes()) is True


def test_is_uala_pdf_wilobank():
    """PDFs from before the rebrand say 'Wilobank S.A.U.' — must also be accepted."""
    wilobank_pdf = Path("data/raw/ResumenDeCuentaTarjetaDeCredito_202409.pdf")
    if wilobank_pdf.exists():
        assert is_uala_pdf(wilobank_pdf.read_bytes()) is True


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


# --- Unit: _parse_p1_tasas ---

P1_WITH_TASAS = """
Tasas
TNA $
TEA
TEM
CFTEA 
con IVA
CFTNA 
con IVA
Intereses Financiación Y Compensatorios en Pesos
113.00%
194.63%
9.29%
265.39%
136.73%
Intereses Punitorios
56.50%
73.72%
4.64%
94.47%
68.37%
Tasas vigentes desde el 03/2026
"""

P1_WITHOUT_TASAS = """
Ualá Bank S.A.U.
Tu deuda en pesos:
$ 71.070,34
"""


def test_parse_p1_tasas_extracts_financiacion_row():
    """P1 parser must extract TNA/TEA/TEM/CFTEA/CFTNA from the Financiación row."""
    result = _parse_p1_tasas(P1_WITH_TASAS)
    assert result["tna"] == 113.0
    assert result["tea"] == 194.63
    assert result["tem"] == 9.29
    assert result["cftea_con_iva"] == 265.39
    assert result["cftna_con_iva"] == 136.73


def test_parse_p1_tasas_returns_none_when_section_missing():
    """P1 parser must return all None when the Tasas section is absent."""
    result = _parse_p1_tasas(P1_WITHOUT_TASAS)
    assert result["tna"] is None
    assert result["tea"] is None
    assert result["cftea_con_iva"] is None


# --- Unit: _parse_legal_tasas ---

LEGAL_WITH_TASAS = (
    "Le informamos que la tasa de financiación vigente a partir del 08/04/2026 será: "
    "119.00% (TNA); 211.22% (TEA); 9.78% (TEM); 289.96% (CFTEA con IVA); 143.99% (CFTNA con IVA)."
)

LEGAL_WITHOUT_TASAS = "Plazos y condiciones generales sin tasas."


def test_parse_legal_tasas_extracts_values():
    """Legal block parser must extract TNA/TEA/TEM/CFTEA/CFTNA from the announced-rates sentence."""
    result = _parse_legal_tasas(LEGAL_WITH_TASAS)
    assert result["tna"] == 119.0
    assert result["tea"] == 211.22
    assert result["tem"] == 9.78
    assert result["cftea_con_iva"] == 289.96
    assert result["cftna_con_iva"] == 143.99


def test_parse_legal_tasas_returns_none_when_absent():
    """Legal block parser must return all None when the rates sentence is absent."""
    result = _parse_legal_tasas(LEGAL_WITHOUT_TASAS)
    assert result["tna"] is None
    assert result["cftea_con_iva"] is None


# --- Integration: extract() returns tasas from real PDF ---

def test_extract_returns_tasas_from_real_pdf():
    """extract() must populate tea and cftea_con_iva from the real 2026-03 PDF."""
    pdf_bytes = PDF_PATH.read_bytes()
    result = extract(pdf_bytes)
    # Real PDF has: TNA=113%, TEA=194.63%, CFTEA con IVA=265.39%
    assert result.statement.tna == 113.0
    assert result.statement.tea == 194.63
    assert result.statement.cftea_con_iva == 265.39


# --- Unit: StatementOut contract ---

def test_statement_out_has_tasas_fields():
    """StatementOut must expose tea, cftea_con_iva, cftea_sin_iva fields."""
    from api.extract.process import StatementOut
    from datetime import date
    s = StatementOut(
        period="2026-03",
        total_debt_ars=None,
        minimum_payment=None,
        previous_balance=None,
        credit_limit=None,
        tna=None,
        tea=None,
        cftea_con_iva=None,
        cftea_sin_iva=None,
        close_date=None,
        due_date=None,
        next_close_date=None,
        next_due_date=None,
        period_from=None,
        period_to=None,
    )
    assert s.tea is None
    assert s.cftea_con_iva is None
    assert s.cftea_sin_iva is None


def test_statement_out_tasas_stores_values():
    """StatementOut must store numeric tasas values when provided."""
    from api.extract.process import StatementOut
    s = StatementOut(
        period="2026-03",
        total_debt_ars=None,
        minimum_payment=None,
        previous_balance=None,
        credit_limit=None,
        tna=97.0,
        tea=154.5,
        cftea_con_iva=312.8,
        cftea_sin_iva=258.5,
        close_date=None,
        due_date=None,
        next_close_date=None,
        next_due_date=None,
        period_from=None,
        period_to=None,
    )
    assert s.tna == 97.0
    assert s.tea == 154.5
    assert s.cftea_con_iva == 312.8
    assert s.cftea_sin_iva == 258.5


# --- Integration: POST /api/extract ---

def test_endpoint_success():
    pdf_bytes = PDF_PATH.read_bytes()
    response = client.post(
        "/api/extract",
        headers=API_HEADERS,
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
        headers=API_HEADERS,
        files={"file": ("file.txt", b"not a pdf", "text/plain")},
    )
    assert response.status_code == 400


# --- Unit: StatementOut *_anunciada fields ---

def test_statement_out_has_anunciada_fields():
    """StatementOut must expose all five *_anunciada fields, defaulting to None."""
    from api.extract.process import StatementOut
    s = StatementOut(
        period="2026-03",
        total_debt_ars=None,
        minimum_payment=None,
        previous_balance=None,
        credit_limit=None,
        tna=None,
        close_date=None,
        due_date=None,
        next_close_date=None,
        next_due_date=None,
        period_from=None,
        period_to=None,
    )
    assert s.tna_anunciada is None
    assert s.tea_anunciada is None
    assert s.tem_anunciada is None
    assert s.cftea_con_iva_anunciada is None
    assert s.cftna_con_iva_anunciada is None


def test_statement_out_anunciada_stores_values():
    """StatementOut must store numeric *_anunciada values when provided."""
    from api.extract.process import StatementOut
    s = StatementOut(
        period="2026-03",
        total_debt_ars=None,
        minimum_payment=None,
        previous_balance=None,
        credit_limit=None,
        tna=None,
        tna_anunciada=119.0,
        tea_anunciada=211.22,
        tem_anunciada=9.78,
        cftea_con_iva_anunciada=289.96,
        cftna_con_iva_anunciada=143.99,
        close_date=None,
        due_date=None,
        next_close_date=None,
        next_due_date=None,
        period_from=None,
        period_to=None,
    )
    assert s.tna_anunciada == 119.0
    assert s.tea_anunciada == 211.22
    assert s.tem_anunciada == 9.78
    assert s.cftea_con_iva_anunciada == 289.96
    assert s.cftna_con_iva_anunciada == 143.99


# --- Integration: extract() populates *_anunciada from legal block ---

def test_extract_populates_anunciada_from_legal_block():
    """extract() must always parse legal block into *_anunciada fields independently of P1."""
    pdf_bytes = PDF_PATH.read_bytes()
    result = extract(pdf_bytes)
    # The real PDF legal block announces next-period rates — they must be populated
    # and must be DIFFERENT from the actual P1 rates (different periods)
    assert result.statement.tna_anunciada is not None
    assert result.statement.cftea_con_iva_anunciada is not None
    # Actual (P1) and announced (legal) must coexist independently
    assert result.statement.tna is not None
    assert result.statement.cftea_con_iva is not None


def test_extract_actual_and_anunciada_are_independent():
    """P1 actual fields and legal announced fields must be parsed independently — no fallback conflation."""
    pdf_bytes = PDF_PATH.read_bytes()
    result = extract(pdf_bytes)
    # Both sets must be populated from their respective sources
    # Actual from P1 table
    assert result.statement.tna == 113.0
    assert result.statement.cftea_con_iva == 265.39
    # Announced from legal block (different values — next period rates)
    assert result.statement.tna_anunciada != result.statement.tna or \
           result.statement.cftea_con_iva_anunciada != result.statement.cftea_con_iva


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
        headers=API_HEADERS,
        files={"file": ("other.pdf", fake_pdf, "application/pdf")},
    )
    assert response.status_code == 422
