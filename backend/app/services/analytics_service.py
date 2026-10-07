"""Dataset analytics, filter application, insights, and recommendations."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import SalesRecord

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _period(value: time) -> str:
    hour = value.hour
    if 5 <= hour < 12:
        return "Morning"
    if 12 <= hour < 17:
        return "Afternoon"
    if 17 <= hour < 21:
        return "Evening"
    return "Night"


def _trend_key(day: date, granularity: str) -> str:
    if granularity == "weekly":
        iso = day.isocalendar()
        return f"{iso.year}-W{iso.week:02d}"
    if granularity == "monthly":
        return day.strftime("%Y-%m")
    return day.isoformat()


def build_dashboard(
    db: Session,
    upload_id: int,
    *,
    date_from: date | None = None,
    date_to: date | None = None,
    item: str | None = None,
    day: str | None = None,
    time_from: time | None = None,
    time_to: time | None = None,
    granularity: str = "daily",
) -> dict:
    available_items = db.scalars(select(SalesRecord.item_name).where(SalesRecord.upload_batch_id == upload_id).distinct().order_by(SalesRecord.item_name)).all()
    statement = select(SalesRecord).where(SalesRecord.upload_batch_id == upload_id)
    if date_from:
        statement = statement.where(SalesRecord.sale_date >= date_from)
    if date_to:
        statement = statement.where(SalesRecord.sale_date <= date_to)
    if item:
        statement = statement.where(SalesRecord.item_name == item)
    if day:
        statement = statement.where(SalesRecord.day == day)
    if time_from:
        statement = statement.where(SalesRecord.sales_time >= time_from)
    if time_to:
        statement = statement.where(SalesRecord.sales_time <= time_to)
    records = db.scalars(statement).all()

    revenue = sum(record.sales_price for record in records)
    count = len(records)
    item_map: dict[str, list[SalesRecord]] = defaultdict(list)
    day_map: dict[str, list[SalesRecord]] = defaultdict(list)
    period_map: dict[str, list[SalesRecord]] = defaultdict(list)
    hour_map: dict[int, list[SalesRecord]] = defaultdict(list)
    trend_map: dict[str, list[SalesRecord]] = defaultdict(list)
    for record in records:
        item_map[record.item_name].append(record)
        day_map[record.day].append(record)
        period_map[_period(record.sales_time)].append(record)
        hour_map[record.sales_time.hour].append(record)
        trend_map[_trend_key(record.sale_date, granularity)].append(record)

    product_rows = []
    for name, item_records in item_map.items():
        item_revenue = sum(row.sales_price for row in item_records)
        product_rows.append({
            "item": name,
            "transactions": len(item_records),
            "revenue": round(item_revenue, 2),
            "revenue_share": round(item_revenue / revenue * 100, 1) if revenue else 0,
            "average_sale": round(item_revenue / len(item_records), 2),
        })
    product_rows.sort(key=lambda row: row["revenue"], reverse=True)
    if product_rows:
        for position, product in enumerate(product_rows):
            rank = position / max(len(product_rows) - 1, 1)
            product["status"] = "Excellent" if rank < 0.2 else "Good" if rank < 0.5 else "Average" if rank < 0.8 else "Low"

    by_day = [{"day": name, "revenue": round(sum(r.sales_price for r in day_map[name]), 2), "transactions": len(day_map[name])} for name in WEEKDAYS]
    by_period = [{"period": name, "revenue": round(sum(r.sales_price for r in period_map[name]), 2), "transactions": len(period_map[name])} for name in ("Morning", "Afternoon", "Evening", "Night")]
    hourly = [{"hour": f"{hour:02d}:00", "revenue": round(sum(r.sales_price for r in hour_map[hour]), 2), "transactions": len(hour_map[hour])} for hour in range(24)]
    trends = [{"period": key, "revenue": round(sum(r.sales_price for r in vals), 2), "transactions": len(vals)} for key, vals in sorted(trend_map.items())]
    best_item = product_rows[0] if product_rows else None
    nonzero_days = [row for row in by_day if row["transactions"]]
    best_day = max(nonzero_days, key=lambda row: row["revenue"], default=None)
    hour_rows = [row for row in hourly if row["transactions"]]
    peak_hour = max(hour_rows, key=lambda row: row["revenue"], default=None)
    lowest_hour = min(hour_rows, key=lambda row: row["revenue"], default=None)
    best_period = max((row for row in by_period if row["transactions"]), key=lambda row: row["revenue"], default=None)

    waste_records = [record for record in records if record.wasted_quantity is not None or record.waste_cost is not None]
    waste_quantity = sum(record.wasted_quantity or 0 for record in waste_records)
    waste_cost = sum(record.waste_cost or 0 for record in waste_records)
    waste_by_item: dict[str, dict[str, float]] = defaultdict(lambda: {"quantity": 0.0, "cost": 0.0})
    for record in waste_records:
        waste_by_item[record.item_name]["quantity"] += record.wasted_quantity or 0
        waste_by_item[record.item_name]["cost"] += record.waste_cost or 0
    waste_top = [{"item": name, "quantity": round(values["quantity"], 2), "cost": round(values["cost"], 2)} for name, values in waste_by_item.items()]
    waste_top.sort(key=lambda row: row["quantity"], reverse=True)
    waste_by_day: dict[str, float] = defaultdict(float)
    waste_trend: dict[date, dict[str, float]] = defaultdict(lambda: {"quantity": 0.0, "cost": 0.0})
    for record in waste_records:
        waste_by_day[record.day] += record.wasted_quantity or 0
        waste_trend[record.sale_date]["quantity"] += record.wasted_quantity or 0
        waste_trend[record.sale_date]["cost"] += record.waste_cost or 0

    insights: list[str] = []
    recommendations: list[str] = []
    if best_item:
        insights.append(f"{best_item['item']} led revenue with {best_item['revenue_share']:.1f}% of sales.")
    if best_day:
        insights.append(f"{best_day['day']} was the strongest sales day at {best_day['revenue']:.2f}.")
    if peak_hour:
        end_hour = (int(peak_hour["hour"][:2]) + 1) % 24
        insights.append(f"Sales peaked during {peak_hour['hour']}–{end_hour:02d}:00.")
    if best_period:
        insights.append(f"{best_period['period']} had the highest revenue among the four time periods.")
    if len(product_rows) >= 2:
        low = product_rows[-1]
        recommendations.append(f"Review demand and promotion for {low['item']}, currently the lowest-revenue item in this selection.")
        weekend_revenue = sum(row["revenue"] for row in by_day if row["day"] in ("Saturday", "Sunday"))
        weekday_revenue = sum(row["revenue"] for row in by_day if row["day"] not in ("Saturday", "Sunday"))
        if weekend_revenue > weekday_revenue:
            recommendations.append(f"Plan production for {best_item['item']} ahead of the weekend; weekends generated more revenue than weekdays in this selection.")
        elif best_period and peak_hour:
            recommendations.append(f"Schedule preparation before {peak_hour['hour']} when {best_period['period'].lower()} demand is strongest.")
    if len(product_rows) >= 3:
        high_volume_low_value = sorted(product_rows, key=lambda row: (row["transactions"], -row["revenue"]))[-1]
        if high_volume_low_value["transactions"] >= max(2, count * 0.2) and high_volume_low_value["revenue_share"] < 15:
            recommendations.append(f"Test a bundle or add-on for {high_volume_low_value['item']}; it has meaningful transaction volume but under 15% of revenue.")
    elif peak_hour and best_item:
        recommendations.append(f"Plan {best_item['item']} preparation ahead of {peak_hour['hour']}, the highest-revenue hour in this selection.")
    recommendations = list(dict.fromkeys(recommendations))[:3]

    return {
        "upload_id": upload_id,
        "currency": "",
        "filters": {"date_from": date_from, "date_to": date_to, "item": item, "day": day, "time_from": time_from, "time_to": time_to, "granularity": granularity},
        "available_items": available_items,
        "summary": {
            "total_sales": round(revenue, 2), "total_transactions": count,
            "average_sale_value": round(revenue / count, 2) if count else 0,
            "best_selling_item": best_item["item"] if best_item else None,
            "best_sales_day": best_day["day"] if best_day else None,
            "peak_sales_hour": peak_hour["hour"] if peak_hour else None,
            "lowest_performing_item": product_rows[-1]["item"] if product_rows else None,
            "lowest_sales_hour": lowest_hour["hour"] if lowest_hour else None,
            "best_sales_period": best_period["period"] if best_period else None,
        },
        "top_items": product_rows[:10],
        "item_share": [{"item": row["item"], "revenue": row["revenue"], "share": row["revenue_share"]} for row in product_rows],
        "sales_by_day": by_day,
        "sales_by_time": by_period,
        "hourly_sales": hourly,
        "trends": trends,
        "products": product_rows,
        "waste": {
            "available": bool(waste_records), "total_quantity": round(waste_quantity, 2), "total_cost": round(waste_cost, 2),
            "waste_percentage": None,
            "percentage_note": "Sales quantity is not present in the uploaded data, so a defensible waste percentage cannot be calculated.",
            "by_item": waste_top, "by_day": [{"day": name, "quantity": round(waste_by_day[name], 2)} for name in WEEKDAYS],
            "trend": [{"date": day.isoformat(), "quantity": round(values["quantity"], 2), "cost": round(values["cost"], 2)} for day, values in sorted(waste_trend.items())],
        },
        "insights": insights,
        "recommendations": recommendations,
    }
