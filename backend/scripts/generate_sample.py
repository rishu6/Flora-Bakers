"""Generate realistic sample sales data for Flora Bakes."""

from datetime import date, datetime, time, timedelta
from pathlib import Path
import random

import pandas as pd


PRODUCTS = {
    "Chocolate Cake": (850, 1.4),
    "Red Velvet Cake": (920, 1.0),
    "Blueberry Muffin": (140, 1.8),
    "Chocolate Croissant": (180, 1.5),
    "Cinnamon Roll": (160, 1.3),
    "Cheesecake Slice": (250, 1.1),
    "Black Forest Pastry": (220, 1.2),
    "Garlic Bread": (190, 0.9),
    "Butter Cookies": (320, 0.8),
    "Fruit Tart": (290, 0.8),
}


def main() -> None:
    random.seed(24)
    rows = []
    start = date(2026, 1, 1)
    names = list(PRODUCTS)
    weights = [PRODUCTS[name][1] for name in names]
    for _ in range(750):
        item = random.choices(names, weights=weights, k=1)[0]
        sale_date = start + timedelta(days=random.randrange(120))
        hour = random.choices([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], [2, 3, 6, 6, 4, 5, 4, 3, 4, 6, 8, 7, 3])[0]
        sale_time = time(hour, random.choice([0, 10, 20, 30, 40, 50]))
        base_price = PRODUCTS[item][0]
        price = round(base_price * random.uniform(0.92, 1.08), 2)
        rows.append({
            "ITEM NAME": item,
            "Sale Date": datetime.combine(sale_date, time()),
            "Day": sale_date.strftime("%A"),
            "Sales Price": price,
            "Sales Time": sale_time.strftime("%H:%M"),
            "Waste Quantity": random.choices([0, 0, 0, 1, 2], [76, 9, 6, 7, 2])[0],
            "Waste Cost": 0,
        })
        rows[-1]["Waste Cost"] = round(rows[-1]["Waste Quantity"] * base_price * 0.35, 2)

    destination = Path(__file__).resolve().parents[2] / "sample_sales.xlsx"
    pd.DataFrame(rows).to_excel(destination, index=False, engine="openpyxl")
    print(f"Created {destination} with {len(rows)} sales rows.")


if __name__ == "__main__":
    main()
