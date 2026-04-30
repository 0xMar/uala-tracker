import os

from fastapi import FastAPI, File, Header, HTTPException, UploadFile

from .process import ExtractResponse, extract, is_uala_pdf

app = FastAPI()

MAX_PDF_SIZE = 5 * 1024 * 1024  # 5MB

EXTRACT_API_SECRET = os.environ.get("EXTRACT_API_SECRET")


@app.post("/api/extract", response_model=ExtractResponse)
async def extract_statement(
    file: UploadFile = File(...),
    x_api_key: str = Header(..., alias="X-API-Key"),
    content_length: int | None = Header(None),
) -> ExtractResponse:
    if not EXTRACT_API_SECRET or x_api_key != EXTRACT_API_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if content_length is not None and content_length > MAX_PDF_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5MB limit")

    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    pdf_bytes = await file.read()

    if not pdf_bytes[:5] == b'%PDF-':
        raise HTTPException(status_code=400, detail="Invalid PDF file")

    if len(pdf_bytes) > MAX_PDF_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5MB limit")

    if not is_uala_pdf(pdf_bytes):
        raise HTTPException(
            status_code=422,
            detail="Not a Ualá statement — 'Ualá Bank S.A.U.' not found on page 1",
        )

    try:
        return extract(pdf_bytes, filename=file.filename or "statement.pdf")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
