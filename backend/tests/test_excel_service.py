from datetime import date, time
from io import BytesIO

import pandas as pd

from app.services.excel_service import parse_workbook


def workbook(frame: pd.DataFrame) -> bytes:
    output = BytesIO()
    frame.to_excel(output, index=False, engine="openpyxl")
    return output.getvalue()


def test_headers_are_case_insensitive_and_day_is_recalculated():
    content = workbook(pd.DataFrame([{
        "ITEM NAME": "  Chocolate   Cake ", "Sale Date": "01-01-2026", "Day": "Wrongday",
        "sales_price": "$850.00", "Sales Time": "10:32",
    }]))
    result = parse_workbook(content, "sales.xlsx")
    assert result["report"]["valid_rows"] == 1
    assert result["rows"][0]["item_name"] == "Chocolate Cake"
    assert result["rows"][0]["sale_date"] == date(2026, 1, 1)
    assert result["rows"][0]["day"] == "Thursday"
    assert result["rows"][0]["sales_time"] == time(10, 32)


def test_invalid_and_duplicate_rows_are_reported_but_duplicates_retained():
    content = workbook(pd.DataFrame([
        {"Item Name": "Muffin", "Sale Date": "2026-02-01", "Sales Price": 100, "Sales Time": "09:00"},
        {"Item Name": " muffin ", "Sale Date": "2026-02-01", "Sales Price": 100, "Sales Time": "09:00"},
        {"Item Name": "Cake", "Sale Date": "not a date", "Sales Price": -2, "Sales Time": "noon"},
    ]))
    result = parse_workbook(content, "sales.xlsx")
    assert result["report"]["valid_rows"] == 2
    assert result["report"]["invalid_rows"] == 1
    assert result["report"]["duplicate_rows"] == 1
    assert result["rows"][1]["duplicate"] is True
    assert result["report"]["missing_value_rows"] == 0


def test_missing_columns_and_extension_are_rejected():
    content = workbook(pd.DataFrame([{"Item": "Cake"}]))
    try:
        parse_workbook(content, "sales.xlsx")
    except ValueError as exc:
        assert "Missing required columns" in str(exc)
    else:
        raise AssertionError("Missing required columns should fail validation")
    try:
        parse_workbook(content, "sales.csv")
    except ValueError as exc:
        assert ".xlsx or .xls" in str(exc)
    else:
        raise AssertionError("Unsupported extension should fail validation")
