import logging
import os

from fastapi import FastAPI, File, Header, HTTPException, UploadFile

from .process import ExtractResponse, extract, is_uala_pdf

app = FastAPI()

logger = logging.getLogger(__name__)

MAX_PDF_SIZE = 5 * 1024 * 1024  # 5MB

EXTRACT_API_SECRET = os.environ.get("EXTRACT_API_SECRET")


@app.post("/api/extract", response_model=ExtractResponse)
async def extract_statement(
    file: UploadFile = File(...),
    x_api_key: str = Header(..., alias="X-API-Key"),
) -> ExtractResponse:
    """Validate and parse a Ualá PDF statement, returning structured JSON.

    Requires a valid X-API-Key matching EXTRACT_API_SECRET.
    Accepts only PDF files up to 5MB that are valid Ualá statements.
    """
    secret = os.environ.get("EXTRACT_API_SECRET") or EXTRACT_API_SECRET
    if not secret or x_api_key != secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    pdf_bytes = await file.read()

    if not pdf_bytes[:5] == b'%PDF-':
        raise HTTPException(status_code=400, detail="Invalid PDF file")

    if len(pdf_bytes) > MAX_PDF_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5MB limit")

    is_valid, _ = is_uala_pdf(pdf_bytes)
    if not is_valid:
        raise HTTPException(
            status_code=422,
            detail="Not a Ualá statement — 'Ualá Bank S.A.U.' not found on page 1",
        )

    try:
        return extract(pdf_bytes, filename=file.filename or "statement.pdf")
    except ValueError as e:
        logger.error("PDF extraction failed: %s", e)
        raise HTTPException(status_code=400, detail="Could not process the PDF file")
