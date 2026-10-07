from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RowIssue(BaseModel):
    row_number: int
    reasons: list[str]
    values: dict[str, str]


class ValidationReport(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    missing_value_rows: int
    waste_available: bool
    issues: list[RowIssue]
    warnings: list[str]


class UploadBatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    original_filename: str
    uploaded_at: datetime
    total_records: int
    valid_records: int
    invalid_records: int
    duplicate_records: int
    missing_value_records: int
    status: str
    waste_available: bool
    validation_report: ValidationReport
