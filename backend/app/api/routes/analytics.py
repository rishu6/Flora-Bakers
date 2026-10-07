"""Dashboard and analytics read endpoints."""

import csv
import io
from datetime import date, time

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import UploadBatch
from app.schemas.analytics import DashboardResponse
from app.services.analytics_service import build_dashboard

router = APIRouter(tags=["analytics"])


def _dashboard(upload_id: int, db: Session, date_from: date | None, date_to: date | None, item: str | None, day: str | None, time_from: time | None, time_to: time | None, granularity: str):
    if db.get(UploadBatch, upload_id) is None:
        raise HTTPException(404, "Upload batch not found.")
    return build_dashboard(db, upload_id, date_from=date_from, date_to=date_to, item=item, day=day, time_from=time_from, time_to=time_to, granularity=granularity)


@router.get("/dashboard/{upload_id}", response_model=DashboardResponse, summary="Get the complete filtered analytics dashboard")
@router.get("/analytics/summary/{upload_id}", response_model=DashboardResponse, include_in_schema=False)
def dashboard(
    upload_id: int,
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    item: str | None = Query(default=None),
    day: str | None = Query(default=None),
    time_from: time | None = Query(default=None),
    time_to: time | None = Query(default=None),
    granularity: str = Query(default="daily", pattern="^(daily|weekly|monthly)$"),
    db: Session = Depends(get_db),
):
    if date_from and date_to and date_from > date_to:
        raise HTTPException(422, "date_from must be on or before date_to.")
    if time_from and time_to and time_from > time_to:
        raise HTTPException(422, "time_from must be on or before time_to.")
    return _dashboard(upload_id, db, date_from, date_to, item, day, time_from, time_to, granularity)


@router.get("/analytics/top-items/{upload_id}", include_in_schema=False)
def top_items(upload_id: int, db: Session = Depends(get_db)):
    return _dashboard(upload_id, db, None, None, None, None, None, None, "daily")["top_items"]


@router.get("/analytics/sales-by-day/{upload_id}", include_in_schema=False)
def sales_by_day(upload_id: int, db: Session = Depends(get_db)):
    return _dashboard(upload_id, db, None, None, None, None, None, None, "daily")["sales_by_day"]


@router.get("/analytics/sales-by-time/{upload_id}", include_in_schema=False)
def sales_by_time(upload_id: int, db: Session = Depends(get_db)):
    result = _dashboard(upload_id, db, None, None, None, None, None, None, "daily")
    return {"periods": result["sales_by_time"], "hours": result["hourly_sales"]}


@router.get("/analytics/trends/{upload_id}", include_in_schema=False)
def trends(upload_id: int, granularity: str = "daily", db: Session = Depends(get_db)):
    if granularity not in {"daily", "weekly", "monthly"}:
        raise HTTPException(422, "granularity must be daily, weekly, or monthly.")
    return _dashboard(upload_id, db, None, None, None, None, None, None, granularity)["trends"]


@router.get("/analytics/item-share/{upload_id}", include_in_schema=False)
def item_share(upload_id: int, db: Session = Depends(get_db)):
    return _dashboard(upload_id, db, None, None, None, None, None, None, "daily")["item_share"]


@router.get("/analytics/waste/{upload_id}", include_in_schema=False)
def waste(upload_id: int, db: Session = Depends(get_db)):
    return _dashboard(upload_id, db, None, None, None, None, None, None, "daily")["waste"]


@router.get("/analytics/insights/{upload_id}", include_in_schema=False)
def insights(upload_id: int, db: Session = Depends(get_db)):
    result = _dashboard(upload_id, db, None, None, None, None, None, None, "daily")
    return {"insights": result["insights"], "recommendations": result["recommendations"]}


@router.get("/analytics/recommendations/{upload_id}", include_in_schema=False)
def recommendations(upload_id: int, db: Session = Depends(get_db)):
    return _dashboard(upload_id, db, None, None, None, None, None, None, "daily")["recommendations"]


@router.get("/reports/{upload_id}.csv", summary="Export dashboard metrics and product performance as CSV")
def export_report(upload_id: int, db: Session = Depends(get_db)):
    result = _dashboard(upload_id, db, None, None, None, None, None, None, "daily")
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Flora Bakes Sales Report"])
    writer.writerow(["Metric", "Value"])
    writer.writerows(result["summary"].items())
    writer.writerow([])
    writer.writerow(["Item", "Transactions", "Revenue", "Revenue Share (%)", "Average Sale", "Status"])
    for row in result["products"]:
        safe_item = "'" + row["item"] if row["item"].startswith(("=", "+", "-", "@")) else row["item"]
        writer.writerow([safe_item, row["transactions"], row["revenue"], row["revenue_share"], row["average_sale"], row["status"]])
    writer.writerow([])
    writer.writerow(["Sales by Day", "Revenue", "Transactions"])
    for row in result["sales_by_day"]:
        writer.writerow([row["day"], row["revenue"], row["transactions"]])
    writer.writerow([])
    writer.writerow(["Sales by Time Period", "Revenue", "Transactions"])
    for row in result["sales_by_time"]:
        writer.writerow([row["period"], row["revenue"], row["transactions"]])
    writer.writerow([])
    writer.writerow(["Insights"])
    writer.writerows([[item] for item in result["insights"]])
    writer.writerow([])
    writer.writerow(["Recommendations"])
    writer.writerows([[item] for item in result["recommendations"]])
    buffer.seek(0)
    return StreamingResponse(iter([buffer.getvalue()]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=flora-bakes-report-{upload_id}.csv"})
