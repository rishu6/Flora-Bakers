"""Excel upload, batch listing, and validation report endpoints."""

import json
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.auth import require_staff
from app.db.database import get_db
from app.db.models import SalesRecord, UploadBatch, UploadWorkbook
from app.schemas.upload import UploadBatchResponse
from app.services.excel_service import parse_workbook
from app.services.product_service import add_uploaded_products

router = APIRouter(prefix="/uploads", tags=["uploads"])
ALLOWED_EXTENSIONS = {".xlsx", ".xls"}
ALLOWED_MIME_TYPES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/octet-stream",
    "application/zip",
}


def _response(batch: UploadBatch) -> dict:
    result = {column.name: getattr(batch, column.name) for column in batch.__table__.columns}
    result["validation_report"] = json.loads(batch.validation_report)
    result["original_file_saved"] = batch.workbook is not None
    return result


@router.post("", response_model=UploadBatchResponse, status_code=status.HTTP_201_CREATED)
async def upload_sales_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    filename = Path((file.filename or "sales.xlsx").replace("\\", "/")).name
    filename = "".join(character for character in filename if character.isprintable())[:255] or "sales.xlsx"
    if Path(filename).suffix.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Only .xlsx and .xls workbooks are supported.")
    if file.content_type and file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(415, "The uploaded file type does not match an Excel workbook.")
    contents = await file.read(settings.max_upload_size_mb * 1024 * 1024 + 1)
    if len(contents) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(413, f"File exceeds the {settings.max_upload_size_mb} MB upload limit.")
    if not contents:
        raise HTTPException(400, "The uploaded file is empty.")
    try:
        parsed = parse_workbook(contents, filename)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc

    report = parsed["report"]
    added, existing = add_uploaded_products(db, parsed["rows"])
    report["products_added"] = added
    report["products_existing"] = existing
    batch = UploadBatch(
        original_filename=filename,
        total_records=report["total_rows"],
        valid_records=report["valid_rows"],
        invalid_records=report["invalid_rows"],
        duplicate_records=report["duplicate_rows"],
        missing_value_records=report["missing_value_rows"],
        status="ready" if report["valid_rows"] else "needs_review",
        validation_report=json.dumps(report, default=str),
        waste_available=report["waste_available"],
        workbook=UploadWorkbook(contents=contents),
    )
    for row in parsed["rows"]:
        batch.records.append(SalesRecord(**{key: value for key, value in row.items() if key != "duplicate"}))
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return _response(batch)


@router.get("", response_model=list[UploadBatchResponse])
def list_uploads(db: Session = Depends(get_db)):
    batches = db.scalars(select(UploadBatch).options(selectinload(UploadBatch.workbook)).order_by(UploadBatch.uploaded_at.desc())).all()
    return [_response(batch) for batch in batches]


@router.get("/{upload_id}", response_model=UploadBatchResponse)
def get_upload(upload_id: int, db: Session = Depends(get_db)):
    batch = db.get(UploadBatch, upload_id)
    if batch is None:
        raise HTTPException(404, "Upload batch not found.")
    return _response(batch)


@router.get("/{upload_id}/file")
def download_original_workbook(upload_id: int, _: str = Depends(require_staff), db: Session = Depends(get_db)):
    batch = db.get(UploadBatch, upload_id)
    if batch is None:
        raise HTTPException(404, "Upload batch not found.")
    if batch.workbook is None:
        raise HTTPException(404, "The original file was not archived for this older upload. Its saved sales data is still available.")
    filename = batch.original_filename
    media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if filename.lower().endswith(".xlsx") else "application/vnd.ms-excel"
    return Response(
        content=batch.workbook.contents,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename, safe='')}",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
