import os

import httpx
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from jose import JWTError, jwt
from jose.backends import RSAKey  # noqa: F401 — needed by python-jose for RS256

from api.extract.process import extract, is_uala_pdf

app = FastAPI()

MAX_PDF_SIZE = 5 * 1024 * 1024  # 5MB

SUPABASE_URL = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SECRET_KEY"]
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"

_jwks_cache: dict | None = None


async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(JWKS_URL)
            resp.raise_for_status()
            _jwks_cache = resp.json()
    return _jwks_cache


async def _get_user_id(authorization: str) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.removeprefix("Bearer ")
    try:
        jwks = await _get_jwks()
        payload = jwt.decode(token, jwks, algorithms=["RS256", "ES256", "HS256"], audience="authenticated")
        return payload["sub"]
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


@app.post("/api/ingest", status_code=201)
async def ingest_statement(
    file: UploadFile = File(...),
    authorization: str = Header(...),
) -> dict:
    user_id = await _get_user_id(authorization)

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    pdf_bytes = await file.read()

    if not pdf_bytes[:5] == b"%PDF-":
        raise HTTPException(status_code=400, detail="Invalid PDF file")

    if len(pdf_bytes) > MAX_PDF_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5MB limit")

    if not is_uala_pdf(pdf_bytes):
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
            "close_date": s.close_date,
            "due_date": s.due_date,
            "next_close_date": s.next_close_date,
            "next_due_date": s.next_due_date,
            "period_from": s.period_from,
            "period_to": s.period_to,
        }

        resp = await client.post(
            "/rest/v1/statements",
            json=stmt_payload,
            headers={**headers, "Prefer": "resolution=merge-duplicates,return=representation"},
        )
        if resp.status_code not in (200, 201):
            raise HTTPException(status_code=502, detail=f"Failed to save statement: {resp.text}")

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
                    "transaction_date": t.transaction_date,
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
                raise HTTPException(status_code=502, detail=f"Failed to save transactions: {resp.text}")

    return {"statement_id": statement_id, "period": s.period, "transactions": len(data.transactions)}
