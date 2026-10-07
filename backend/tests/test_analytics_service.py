from datetime import date, time

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db.database import Base
from app.db.models import SalesRecord, UploadBatch
from app.services.analytics_service import build_dashboard


def test_dashboard_calculates_revenue_day_time_and_item_share():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        batch = UploadBatch(original_filename="sales.xlsx", status="ready")
        db.add(batch)
        db.flush()
        db.add_all([
            SalesRecord(item_name="Cake", sale_date=date(2026, 1, 3), day="Saturday", sales_price=500, sales_time=time(18, 0), upload_batch_id=batch.id),
            SalesRecord(item_name="Cake", sale_date=date(2026, 1, 3), day="Saturday", sales_price=500, sales_time=time(18, 30), upload_batch_id=batch.id),
            SalesRecord(item_name="Muffin", sale_date=date(2026, 1, 4), day="Sunday", sales_price=100, sales_time=time(10, 0), upload_batch_id=batch.id),
        ])
        db.flush()
        result = build_dashboard(db, batch.id)
        assert result["summary"]["total_sales"] == 1100
        assert result["summary"]["total_transactions"] == 3
        assert result["summary"]["average_sale_value"] == round(1100 / 3, 2)
        assert result["summary"]["best_selling_item"] == "Cake"
        assert result["summary"]["best_sales_day"] == "Saturday"
        assert result["summary"]["peak_sales_hour"] == "18:00"
        assert result["item_share"][0]["share"] == 90.9
        assert result["waste"]["available"] is False
    engine.dispose()
