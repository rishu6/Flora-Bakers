"""Database models for uploaded datasets and sales rows."""

from datetime import date, datetime, time, timezone

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, Time, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UploadBatch(Base):
    __tablename__ = "upload_batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    total_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    valid_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    invalid_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duplicate_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    missing_value_records: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="needs_review", nullable=False)
    validation_report: Mapped[str] = mapped_column(Text, default="{}", nullable=False)
    waste_available: Mapped[bool] = mapped_column(default=False, nullable=False)

    records: Mapped[list["SalesRecord"]] = relationship(back_populates="batch", cascade="all, delete-orphan")


class SalesRecord(Base):
    __tablename__ = "sales_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
    sale_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    day: Mapped[str] = mapped_column(String(12), index=True, nullable=False)
    sales_price: Mapped[float] = mapped_column(Float, nullable=False)
    sales_time: Mapped[time] = mapped_column(Time, nullable=False)
    wasted_quantity: Mapped[float | None] = mapped_column(Float, nullable=True)
    waste_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    upload_batch_id: Mapped[int] = mapped_column(ForeignKey("upload_batches.id", ondelete="CASCADE"), index=True)

    batch: Mapped[UploadBatch] = relationship(back_populates="records")
