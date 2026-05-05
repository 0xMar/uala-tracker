import hashlib
import hmac
import logging
import os
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, File, Header, HTTPException, UploadFile

from api.extract.process import extract, is_uala_pdf

app = FastAPI()

MAX_PDF_SIZE = 5 * 1024 * 1024  # 5MB

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SECRET_KEY"]
API_KEY_HMAC_SECRET = os.environ["API_KEY_HMAC_SECRET"]

logger = logging.getLogger(__name__)


async def _validate_api_key(api_key: str) -> str:
    """Validate API key and return user_id."""
    if not api_key.startswith("uala_"):
        raise HTTPException(status_code=401, detail="Invalid API key format")

    # Hash the key to compare with stored hash
    key_hash = hmac.new(
        API_KEY_HMAC_SECRET.encode(), api_key.encode(), hashlib.sha256
    ).hexdigest()

    # Query Supabase to find the key
    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }

    async with httpx.AsyncClient(base_url=SUPABASE_URL) as client:
        resp = await client.get(
            "/rest/v1/api_keys",
            params={"key_hash": f"eq.{key_hash}", "revoked_at": "is.null", "select": "user_id,id"},
            headers=headers,
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid API key")

        keys = resp.json()
        if not keys:
            raise HTTPException(status_code=401, detail="Invalid or revoked API key")

        # Update last_used_at
        key_id = keys[0]["id"]
        patch_resp = await client.patch(
            f"/rest/v1/api_keys?id=eq.{key_id}",
            json={"last_used_at": datetime.now(timezone.utc).isoformat()},
            headers=headers,
        )
        if patch_resp.status_code not in (200, 204):
            logger.warning(
                "Failed to update last_used_at for key %s: %s",
                key_id,
                patch_resp.text,
            )

        return keys[0]["user_id"]


@app.post("/api/ingest", status_code=201)
async def ingest_statement(
    file: UploadFile = File(...),
    x_api_key: str = Header(..., alias="X-API-Key"),
    content_length: int | None = Header(None),
) -> dict:
    user_id = await _validate_api_key(x_api_key)

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    if content_length is not None and content_length > MAX_PDF_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5MB limit")

    pdf_bytes = await file.read()

    if not pdf_bytes[:5] == b"%PDF-":
        raise HTTPException(status_code=400, detail="Invalid PDF file")

    if len(pdf_bytes) > MAX_PDF_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5MB limit")

    is_valid, reason = is_uala_pdf(pdf_bytes)
    if not is_valid:
        logger.warning("PDF validation failed for user %s: %s", user_id, reason)
        raise HTTPException(status_code=422, detail="Not a Ualá statement")

    data = extract(pdf_bytes, filename=file.filename or "statement.pdf")
    s = data.statement

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    async with httpx.AsyncClient(base_url=SUPABASE_URL) as client:
        # Upsert statement (insert or replace by user_id + period)
        stmt_payload = {
            "user_id": user_id,
            "period": s.period,
            "is_paid": False,
            "total_debt_ars": s.total_debt_ars,
            "minimum_payment": s.minimum_payment,
            "previous_balance": s.previous_balance,
            "credit_limit": s.credit_limit,
            "tna": s.tna,
            "tea": s.tea,
            "cftea_con_iva": s.cftea_con_iva,
            "cftna_con_iva": s.cftna_con_iva,
            "tna_anunciada": s.tna_anunciada,
            "tea_anunciada": s.tea_anunciada,
            "tem_anunciada": s.tem_anunciada,
            "cftea_con_iva_anunciada": s.cftea_con_iva_anunciada,
            "cftna_con_iva_anunciada": s.cftna_con_iva_anunciada,
            "close_date": s.close_date.isoformat() if s.close_date else None,
            "due_date": s.due_date.isoformat() if s.due_date else None,
            "next_close_date": s.next_close_date.isoformat() if s.next_close_date else None,
            "next_due_date": s.next_due_date.isoformat() if s.next_due_date else None,
            "period_from": s.period_from.isoformat() if s.period_from else None,
            "period_to": s.period_to.isoformat() if s.period_to else None,
        }

        resp = await client.post(
            "/rest/v1/statements",
            json=stmt_payload,
            headers={**headers, "Prefer": "resolution=merge-duplicates,return=representation"},
        )
        if resp.status_code not in (200, 201):
            logger.error("Failed to save statement for user %s: %s", user_id, resp.text)
            raise HTTPException(status_code=502, detail="Failed to save statement")

        statement_id = resp.json()[0]["id"]

        # Delete existing transactions for this statement (in case of replace)
        await client.delete(
            f"/rest/v1/transactions?statement_id=eq.{statement_id}",
            headers=headers,
        )

        # Insert transactions
        if data.transactions:
            txns = [
                {
                    "user_id": user_id,
                    "statement_id": statement_id,
                    "transaction_date": t.transaction_date.isoformat() if t.transaction_date else None,
                    "merchant": t.merchant,
                    "amount_ars": t.amount_ars,
                    "installment_current": t.installment_current,
                    "installments_total": t.installments_total,
                    "coupon_number": t.coupon_number,
                    "type": t.type,
                }
                for t in data.transactions
            ]
            resp = await client.post("/rest/v1/transactions", json=txns, headers=headers)
            if resp.status_code not in (200, 201):
                logger.error("Failed to save transactions for user %s: %s", user_id, resp.text)
                raise HTTPException(status_code=502, detail="Failed to save transactions")

    return {"statement_id": statement_id, "period": s.period, "transactions": len(data.transactions)}
