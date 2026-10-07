"""Excel parsing, column matching, normalization, and row validation."""

from __future__ import annotations

import io
import re
from datetime import date, datetime, time, timedelta
from typing import Any

import pandas as pd


ALIASES = {
    "item_name": {"item", "item name", "product", "product name", "itemname"},
    "sale_date": {"sale date", "sales date", "date", "transaction date"},
    "day": {"day", "day of week", "weekday"},
    "sales_price": {"sales price", "sale price", "price", "revenue", "amount", "total", "sales"},
    "sales_time": {"sales time", "sale time", "time", "transaction time"},
    "wasted_quantity": {"wasted quantity", "waste quantity", "wastage quantity", "wasted items", "waste", "wastage"},
    "waste_cost": {"waste cost", "wasted cost", "wastage cost"},
}
REQUIRED = ("item_name", "sale_date", "sales_price", "sales_time")


def normalize_header(value: Any) -> str:
    text = str(value).strip().lower().replace("_", " ").replace("-", " ")
    return re.sub(r"\s+", " ", text)


def _money(value: Any) -> float | None:
    if pd.isna(value) or str(value).strip() == "":
        return None
    try:
        raw = str(value).strip()
        if "," in raw and "." not in raw and re.search(r",\d{1,2}$", raw):
            raw = raw.replace(".", "").replace(",", ".")
        amount = float(re.sub(r"[^\d.\-]", "", raw))
        return amount if amount >= 0 else None
    except (TypeError, ValueError):
        return None


def _date(value: Any) -> date | None:
    if pd.isna(value) or str(value).strip() == "":
        return None
    try:
        parsed = pd.to_datetime(value, errors="coerce", dayfirst=True)
        if pd.isna(parsed):
            return None
        return parsed.date()
    except (TypeError, ValueError, OverflowError):
        return None


def _time(value: Any) -> time | None:
    if pd.isna(value) or str(value).strip() == "":
        return None
    if isinstance(value, time):
        return value.replace(second=0, microsecond=0)
    if isinstance(value, (datetime, pd.Timestamp)):
        return value.time().replace(second=0, microsecond=0)
    if isinstance(value, timedelta):
        seconds = int(value.total_seconds()) % 86400
        return time(seconds // 3600, (seconds % 3600) // 60)
    if isinstance(value, (int, float)) and 0 <= float(value) < 1:
        minutes = round(float(value) * 24 * 60) % 1440
        return time(minutes // 60, minutes % 60)
    parsed = pd.to_datetime(str(value).strip(), errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.time().replace(second=0, microsecond=0)


def parse_workbook(contents: bytes, filename: str) -> dict[str, Any]:
    """Parse one sheet, preserving invalid-row detail and duplicate flags."""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in {"xlsx", "xls"}:
        raise ValueError("Upload an Excel workbook with a .xlsx or .xls extension.")
    try:
        frame = pd.read_excel(io.BytesIO(contents), engine="openpyxl" if extension == "xlsx" else "xlrd")
    except Exception as exc:
        raise ValueError("The file could not be read as an Excel workbook. Check that it is not damaged or password-protected.") from exc

    headers: dict[str, str] = {}
    for original in frame.columns:
        normalized = normalize_header(original)
        for canonical, names in ALIASES.items():
            if normalized in names or normalized in {normalize_header(alias) for alias in names}:
                headers.setdefault(canonical, original)
    missing_columns = [name.replace("_", " ").title() for name in REQUIRED if name not in headers]
    if missing_columns:
        raise ValueError("Missing required columns: " + ", ".join(missing_columns))

    output_rows: list[dict[str, Any]] = []
    issues: list[dict[str, Any]] = []
    missing_rows = 0
    seen: set[tuple[Any, ...]] = set()
    duplicate_count = 0
    for index, raw in frame.iterrows():
        reasons: list[str] = []
        values = {name: raw.get(column) for name, column in headers.items()}
        item_value = values.get("item_name")
        item = "" if item_value is None or pd.isna(item_value) else " ".join(str(item_value).split())
        sale_date = _date(values.get("sale_date"))
        price = _money(values.get("sales_price"))
        sale_time = _time(values.get("sales_time"))
        missing = any(values.get(field) is None or pd.isna(values.get(field)) or str(values.get(field)).strip() == "" for field in REQUIRED)
        if missing:
            missing_rows += 1
        if not item:
            reasons.append("Item Name is blank.")
        elif len(item) > 200:
            reasons.append("Item Name must be 200 characters or fewer.")
        if sale_date is None:
            reasons.append("Sale Date is missing or invalid.")
        if price is None:
            reasons.append("Sales Price is missing, invalid, or below zero.")
        if sale_time is None:
            reasons.append("Sales Time is missing or invalid.")

        raw_waste_quantity = values.get("wasted_quantity")
        raw_waste_cost = values.get("waste_cost")
        wasted_quantity = _money(raw_waste_quantity) if raw_waste_quantity is not None else None
        waste_cost = _money(raw_waste_cost) if raw_waste_cost is not None else None
        if raw_waste_quantity is not None and not pd.isna(raw_waste_quantity) and str(raw_waste_quantity).strip() and wasted_quantity is None:
            reasons.append("Waste Quantity must be a number greater than or equal to zero.")
        if raw_waste_cost is not None and not pd.isna(raw_waste_cost) and str(raw_waste_cost).strip() and waste_cost is None:
            reasons.append("Waste Cost must be a number greater than or equal to zero.")
        row_number = int(index) + 2
        if reasons:
            issues.append({"row_number": row_number, "reasons": reasons, "values": {k: str(v)[:200] for k, v in values.items()}})
            continue

        key = (item.casefold(), sale_date, sale_time, price)
        duplicate = key in seen
        if duplicate:
            duplicate_count += 1
        seen.add(key)
        output_rows.append({
            "item_name": item,
            "sale_date": sale_date,
            "day": sale_date.strftime("%A"),
            "sales_price": price,
            "sales_time": sale_time,
            "wasted_quantity": wasted_quantity,
            "waste_cost": waste_cost,
            "duplicate": duplicate,
        })

    total = len(frame)
    warnings = []
    if "day" in headers:
        warnings.append("Day values are recalculated from Sale Date to ensure consistency.")
    if duplicate_count:
        warnings.append("Duplicate records are flagged and retained in the analysis.")
    if len(issues) > 500:
        warnings.append("Only the first 500 invalid row details are included in this report; all invalid rows are included in the count.")
    waste_available = "wasted_quantity" in headers or "waste_cost" in headers
    return {
        "rows": output_rows,
        "report": {
            "total_rows": total,
            "valid_rows": len(output_rows),
            "invalid_rows": len(issues),
            "duplicate_rows": duplicate_count,
            "missing_value_rows": missing_rows,
            "waste_available": waste_available,
            "issues": issues[:500],
            "warnings": warnings,
        },
    }
