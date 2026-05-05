"""
Extraction logic for Ualá credit card PDF statements.
Adapted from process_all_statements.py to work with in-memory bytes.
"""
from __future__ import annotations

import re
from datetime import date
from io import BytesIO
from typing import Any

import pypdf
from pydantic import BaseModel

UALA_IDENTIFIER = "Ualá Bank S.A.U."
WILOBANK_IDENTIFIER = "Wilobank S.A.U."  # nombre anterior al cambio de marca

MESES: dict[str, int] = {
    "ENE": 1, "ENERO": 1, "FEB": 2, "FEBRERO": 2, "MAR": 3, "MARZO": 3,
    "ABR": 4, "ABRIL": 4, "MAY": 5, "MAYO": 5, "JUN": 6, "JUNIO": 6,
    "JUL": 7, "JULIO": 7, "AGO": 8, "AGOSTO": 8, "SEP": 9, "SEPTIEMBRE": 9,
    "OCT": 10, "OCTUBRE": 10, "NOV": 11, "NOVIEMBRE": 11, "DIC": 12, "DICIEMBRE": 12,
}


# --- Pydantic models (contract with Next.js) ---

class TransactionOut(BaseModel):
    transaction_date: date
    merchant: str
    amount_ars: float
    installment_current: int
    installments_total: int
    coupon_number: str | None
    type: str  # CONSUMO | PAGO | IMPUESTO


class StatementOut(BaseModel):
    period: str  # YYYY-MM
    total_debt_ars: float | None
    minimum_payment: float | None
    previous_balance: float | None
    credit_limit: float | None
    # Actual tasas — sourced from P1 table
    tna: float | None
    tea: float | None = None
    cftea_con_iva: float | None = None
    cftna_con_iva: float | None = None
    # Announced tasas — sourced from legal block (next-period rates)
    tna_anunciada: float | None = None
    tea_anunciada: float | None = None
    tem_anunciada: float | None = None
    cftea_con_iva_anunciada: float | None = None
    cftna_con_iva_anunciada: float | None = None
    close_date: date | None
    due_date: date | None
    next_close_date: date | None
    next_due_date: date | None
    period_from: date | None
    period_to: date | None


class ExtractResponse(BaseModel):
    statement: StatementOut
    transactions: list[TransactionOut]
    reconciliation: dict[str, Any]


# --- Helpers ---

def _normalize(text: str | None) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def _parse_amount(text: str | None) -> float:
    if not text:
        return 0.0
    cleaned = text.replace("$", "").replace("USD", "").replace(" ", "").strip()
    if "," in cleaned and "." in cleaned:
        cleaned = cleaned.replace(".", "").replace(",", ".")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")
    return float(re.sub(r"[^0-9.\-]", "", cleaned) or 0)


def _parse_date(text: str | None) -> date | None:
    """Parse 'DD MMM YYYY' or 'DD/MM' style dates."""
    if not text:
        return None
    m = re.match(r"^(\d{1,2})\s+([A-ZÁÉÍÓÚ]{3,10})\s+(\d{4})$", text.strip().upper())
    if m:
        day, mes_txt, year = m.groups()
        mes = MESES.get(mes_txt)
        if mes:
            try:
                return date(int(year), mes, int(day))
            except ValueError:
                return None
    return None


def _parse_short_date(text: str | None, year: int) -> date | None:
    """Parse 'DD/MM' with a known year."""
    if not text:
        return None
    m = re.match(r"^(\d{2})/(\d{2})$", text.strip())
    if m:
        day, month = m.groups()
        try:
            return date(year, int(month), int(day))
        except ValueError:
            return None
    return None


def _is_amount_line(line: str) -> bool:
    return re.fullmatch(r"-?[\d\.]+,\d{2}", line or "") is not None


def _is_coupon_line(line: str) -> bool:
    return re.fullmatch(r"R\d{4,}", line or "") is not None


def _is_code_line(line: str) -> bool:
    return re.fullmatch(r"\d{1,4}", line or "") is not None


def _movement_type(description: str) -> str:
    desc = (description or "").upper()
    if "PAGO CON SALDO EN CUENTA" in desc:
        return "PAGO"
    if "IMPUESTO DE SELLOS" in desc:
        return "IMPUESTO"
    return "CONSUMO"


def _block_description(lines: list[str], section_type: str) -> str:
    parts = []
    for line in lines:
        t = _normalize(line)
        if not t:
            continue
        if _is_amount_line(t) or _is_coupon_line(t) or _is_code_line(t):
            continue
        if re.search(r"\(\d{2}/\d{2}\)", t):
            continue
        if t.upper() in {"TOTAL", "PESOS", "DÓLARES", "PAGO EN PESOS", "PAGO EN DÓLARES"}:
            continue
        if section_type == "IMPUESTO" and "TOTAL" in t.upper():
            continue
        t = re.sub(r"\s*-?\$?\s*[\d\.]+,\d{2}(\b|$)", "", t).strip()
        t = re.sub(r"\bUSD\b\s*[\d\.]*,\d{2}\b", "", t).strip()
        t = _normalize(t)
        if t:
            parts.append(t)
    if not parts:
        return "S/D"
    return _normalize(" ".join(parts[:2] if section_type == "CONSUMO" else parts[:3]))


def _detect_sections(lines: list[str]) -> dict[str, int]:
    idx: dict[str, int] = {}
    for i, raw in enumerate(lines):
        t = _normalize(raw)
        if t.startswith("Consumos"):
            idx.setdefault("CONSUMO", i)
        elif t.startswith("Pagos"):
            idx.setdefault("PAGO", i)
        elif t.startswith("Impuestos"):
            idx.setdefault("IMPUESTO", i)
        elif t.startswith("Desconocimiento"):
            idx.setdefault("FIN", i)
    return idx


def _extract_section(
    lines: list[str], start: int, end: int, section_type: str
) -> list[dict[str, Any]]:
    patron_fecha = re.compile(r"^\d{2} [A-ZÁÉÍÓÚ]{3,5} \d{2}$")
    movements = []
    i = start
    while i < end:
        fecha = _normalize(lines[i])
        if not patron_fecha.match(fecha):
            i += 1
            continue
        j = i + 1
        while j < end and not patron_fecha.match(_normalize(lines[j])):
            j += 1
        block = [_normalize(x) for x in lines[i + 1:j] if _normalize(x)]
        amounts = [x for x in block if _is_amount_line(x)]
        amount_text = amounts[-1] if amounts else "0,00"
        block_text = " ".join(block)
        installments = re.search(r"\((\d{2})\/(\d{2})\)", block_text)
        coupon = next((x for x in block if _is_coupon_line(x)), None)
        movements.append({
            "fecha": fecha,
            "merchant": _block_description(block, section_type),
            "amount": _parse_amount(amount_text),
            "installment_current": int(installments.group(1)) if installments else 1,
            "installments_total": int(installments.group(2)) if installments else 1,
            "coupon_number": coupon,
            "type": section_type,
        })
        i = j
    return movements


def _extract_movement_text(reader: pypdf.PdfReader) -> str:
    texts = []
    for page in reader.pages:
        raw = page.extract_text() or ""
        first_line = next(
            (_normalize(l) for l in raw.split("\n") if _normalize(l)), ""
        )
        if first_line.startswith("Legales"):
            continue
        texts.append(raw)
    return "\n".join(texts)


def _extract_statement_totals(text: str) -> dict[str, float | None]:
    consumos = re.search(r"Consumos.*?Total\s*\$?\s*([\d\.]+,\d{2})", text, re.S)
    pagos = re.search(r"Pagos.*?Total\s*-?\s*\$?\s*([\d\.]+,\d{2})", text, re.S)
    impuestos = re.search(r"Impuestos.*?Total\s*(-?)\s*\$?\s*([\d\.]+,\d{2})", text, re.S)
    tax_total = None
    if impuestos:
        sign = -1 if impuestos.group(1) == "-" else 1
        tax_total = sign * _parse_amount(impuestos.group(2))
    return {
        "CONSUMO": _parse_amount(consumos.group(1)) if consumos else None,
        "PAGO": -_parse_amount(pagos.group(1)) if pagos else None,
        "IMPUESTO": tax_total,
    }


def _parse_percentage(text: str) -> float | None:
    """Parse a percentage string like '113.00%' or '113,00%' to float."""
    if not text:
        return None
    cleaned = text.replace("%", "").replace(",", ".").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def _empty_tasas() -> dict[str, float | None]:
    return {"tna": None, "tea": None, "tem": None, "cftea_con_iva": None, "cftna_con_iva": None}


def _parse_p1_tasas(p1_text: str) -> dict[str, float | None]:
    """Extract tasas from the P1 'Tasas' table (Financiación row).

    The table layout in the PDF text looks like:
        Tasas
        TNA $  TEA  TEM  CFTEA con IVA  CFTNA con IVA
        Intereses Financiación Y Compensatorios en Pesos
        113.00%  194.63%  9.29%  265.39%  136.73%
        Intereses Punitorios
        ...

    After pypdf extraction the percentages appear on a single line or
    consecutive lines after the 'Financiación' label.
    """
    result = _empty_tasas()
    # Locate the Tasas section header
    tasas_m = re.search(r"Tasas\s", p1_text)
    if not tasas_m:
        return result

    # Grab text from the Tasas header onward
    section = p1_text[tasas_m.start():]

    # Find the Financiación row — collect the 5 percentages that follow it
    fin_m = re.search(
        r"Intereses\s+Financiaci[oó]n\s+Y\s+Compensatorios\s+en\s+Pesos\s*\n"
        r"([\d.,]+%)\s*\n([\d.,]+%)\s*\n([\d.,]+%)\s*\n([\d.,]+%)\s*\n([\d.,]+%)",
        section,
        re.IGNORECASE,
    )
    if not fin_m:
        # Try single-line variant: all 5 values on one line
        fin_m = re.search(
            r"Intereses\s+Financiaci[oó]n\s+Y\s+Compensatorios\s+en\s+Pesos\s*\n"
            r"([\d.,]+%)\s+([\d.,]+%)\s+([\d.,]+%)\s+([\d.,]+%)\s+([\d.,]+%)",
            section,
            re.IGNORECASE,
        )
    if fin_m:
        result["tna"] = _parse_percentage(fin_m.group(1))
        result["tea"] = _parse_percentage(fin_m.group(2))
        result["tem"] = _parse_percentage(fin_m.group(3))
        result["cftea_con_iva"] = _parse_percentage(fin_m.group(4))
        result["cftna_con_iva"] = _parse_percentage(fin_m.group(5))
    return result


def _parse_legal_tasas(legal_text: str) -> dict[str, float | None]:
    """Extract announced tasas from the Legales block sentence.

    Matches patterns like:
        "119.00% (TNA); 211.22% (TEA); 9.78% (TEM); 289.96% (CFTEA con IVA); 143.99% (CFTNA con IVA)"
    """
    result = _empty_tasas()
    m = re.search(
        r"([\d.,]+)%\s*\(TNA\).*?"
        r"([\d.,]+)%\s*\(TEA\).*?"
        r"([\d.,]+)%\s*\(TEM\).*?"
        r"([\d.,]+)%\s*\(CFTEA\s+con\s+IVA\).*?"
        r"([\d.,]+)%\s*\(CFTNA\s+con\s+IVA\)",
        legal_text,
        re.IGNORECASE | re.DOTALL,
    )
    if m:
        result["tna"] = _parse_percentage(m.group(1))
        result["tea"] = _parse_percentage(m.group(2))
        result["tem"] = _parse_percentage(m.group(3))
        result["cftea_con_iva"] = _parse_percentage(m.group(4))
        result["cftna_con_iva"] = _parse_percentage(m.group(5))
    return result




def is_uala_pdf(pdf_bytes: bytes) -> tuple[bool, str]:
    try:
        reader = pypdf.PdfReader(BytesIO(pdf_bytes))
        if not reader.pages:
            return False, "PDF has no pages"
        first_page = reader.pages[0].extract_text() or ""
        if UALA_IDENTIFIER in first_page or WILOBANK_IDENTIFIER in first_page:
            return True, ""
        # Return a snippet of the first page to debug what text it actually saw
        snippet = first_page[:100].replace("\n", " ")
        return False, f"Missing Ualá identifier. Found text snippet: '{snippet}'"
    except Exception as e:
        return False, f"pypdf Exception: {str(e)}"


def extract(pdf_bytes: bytes, filename: str = "statement.pdf") -> ExtractResponse:
    reader = pypdf.PdfReader(BytesIO(pdf_bytes))
    if len(reader.pages) < 2:
        raise ValueError("PDF must have at least 2 pages")

    p1 = reader.pages[0].extract_text() or ""
    movement_text = _extract_movement_text(reader)
    lines = movement_text.split("\n")

    # --- Tasas: P1 table → actual fields; legal block → announced fields (always both) ---
    actual_tasas = _parse_p1_tasas(p1)
    legal_text = reader.pages[-1].extract_text() or ""
    announced_tasas = _parse_legal_tasas(legal_text)

    # --- Metadata from page 1 ---
    due_date_m = re.search(r"Fecha de vencimiento\n(\d{2} [A-Z][a-z]+ \d{4})", p1)
    close_date_m = re.search(r"Fecha de cierre\n(\d{2} [A-Z][a-z]+ \d{4})", p1)
    min_payment_m = re.search(r"Pago mínimo\n\$ ([\d\.]+,\d{2})", p1)
    prev_balance_m = re.search(r"(?:Resumen anterior|Deuda anterior)\n\$ ([\d\.]+,\d{2})", p1)
    total_debt_m = re.search(r"Tu deuda en pesos:\n\$ ([\d\.]+,\d{2})", p1)
    credit_limit_m = re.search(r"(\$[\d\.]+,\d{2})\s+de compra en 1 cuota", p1)
    # tna is now sourced from the tasas dict; keep legacy regex as fallback
    tna_m = re.search(r"Intereses Financiación Y Compensatorios en Pesos\n([\d\.]+)%", p1)

    # Period facturado: "27 Feb 2026 - 30 Mar 2026"
    period_range_m = re.search(
        r"Período facturado\n(\d{2} [A-Z][a-z]+ \d{4}) - (\d{2} [A-Z][a-z]+ \d{4})", p1
    )

    # Ciclos: próximo cierre y vencimiento (DD/MM format)
    current_year = date.today().year
    next_close_m = re.search(r"Próximo cierre\n(\d{2}/\d{2})", p1)
    next_due_m = re.search(r"Próximo vencimiento\n(\d{2}/\d{2})", p1)

    due_date = _parse_date(due_date_m.group(1) if due_date_m else None)
    close_date = _parse_date(close_date_m.group(1) if close_date_m else None)
    period_from = _parse_date(period_range_m.group(1) if period_range_m else None)
    period_to = _parse_date(period_range_m.group(2) if period_range_m else None)
    next_close = _parse_short_date(next_close_m.group(1) if next_close_m else None, current_year)
    next_due = _parse_short_date(next_due_m.group(1) if next_due_m else None, current_year)

    # Derive period (YYYY-MM) from close_date or period_to
    ref_date = close_date or period_to or due_date
    period = f"{ref_date.year}-{ref_date.month:02d}" if ref_date else "unknown"

    statement = StatementOut(
        period=period,
        total_debt_ars=_parse_amount(total_debt_m.group(1)) if total_debt_m else None,
        minimum_payment=_parse_amount(min_payment_m.group(1)) if min_payment_m else None,
        previous_balance=_parse_amount(prev_balance_m.group(1)) if prev_balance_m else None,
        credit_limit=_parse_amount(credit_limit_m.group(1)) if credit_limit_m else None,
        # Actual tasas from P1 table
        tna=actual_tasas["tna"] if actual_tasas["tna"] is not None else (float(tna_m.group(1)) if tna_m else None),
        tea=actual_tasas["tea"],
        cftea_con_iva=actual_tasas["cftea_con_iva"],
        cftna_con_iva=actual_tasas["cftna_con_iva"],
        # Announced tasas from legal block
        tna_anunciada=announced_tasas["tna"],
        tea_anunciada=announced_tasas["tea"],
        tem_anunciada=announced_tasas["tem"],
        cftea_con_iva_anunciada=announced_tasas["cftea_con_iva"],
        cftna_con_iva_anunciada=announced_tasas["cftna_con_iva"],
        close_date=close_date,
        due_date=due_date,
        next_close_date=next_close,
        next_due_date=next_due,
        period_from=period_from,
        period_to=period_to,
    )

    # --- Movements ---
    sections = _detect_sections(lines)
    start_consumo = sections.get("CONSUMO", 0)
    start_pago = sections.get("PAGO", len(lines))
    start_impuesto = sections.get("IMPUESTO", len(lines))
    end = sections.get("FIN", len(lines))

    raw_movements = (
        _extract_section(lines, start_consumo, min(start_pago, end), "CONSUMO")
        + _extract_section(lines, start_pago, min(start_impuesto, end), "PAGO")
        + _extract_section(lines, start_impuesto, end, "IMPUESTO")
    )

    # Dedup within PDF
    seen: set[tuple] = set()
    transactions: list[TransactionOut] = []
    for m in raw_movements:
        key = (m["fecha"], m["merchant"].upper(), f"{m['amount']:.2f}",
               m["installment_current"], m["installments_total"])
        if key in seen:
            continue
        seen.add(key)
        txn_date_ts = _parse_date_from_statement(m["fecha"])
        if txn_date_ts is None:
            continue
        transactions.append(TransactionOut(
            transaction_date=txn_date_ts,
            merchant=m["merchant"],
            amount_ars=m["amount"],
            installment_current=m["installment_current"],
            installments_total=m["installments_total"],
            coupon_number=m["coupon_number"],
            type=m["type"],
        ))

    # Reconciliation
    extracted_totals = {"CONSUMO": 0.0, "PAGO": 0.0, "IMPUESTO": 0.0}
    for t in transactions:
        extracted_totals[t.type] += t.amount_ars
    expected = _extract_statement_totals(movement_text)
    tolerance = 0.01
    ok = True
    deltas: dict[str, float | None] = {}
    for tipo in ["CONSUMO", "PAGO", "IMPUESTO"]:
        exp = expected[tipo]
        got = round(extracted_totals[tipo], 2)
        if exp is None:
            deltas[tipo] = None
            if tipo == "CONSUMO":
                ok = False
            continue
        delta = round(got - exp, 2)
        deltas[tipo] = delta
        if abs(delta) > tolerance:
            ok = False

    return ExtractResponse(
        statement=statement,
        transactions=transactions,
        reconciliation={"ok": ok, "deltas": deltas},
    )


def _parse_date_from_statement(fecha: str) -> date | None:
    """Parse 'DD MMM YY' format used in statement movement lines."""
    m = re.match(r"^(\d{2})\s+([A-ZÁÉÍÓÚ]{3,5})\s+(\d{2})$", fecha.strip().upper())
    if not m:
        return None
    day, mes_txt, yy = m.groups()
    mes = MESES.get(mes_txt)
    if not mes:
        return None
    year = 2000 + int(yy)
    try:
        return date(year, mes, int(day))
    except ValueError:
        return None
