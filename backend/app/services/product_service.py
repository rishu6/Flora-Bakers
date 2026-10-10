"""Add imported product names to the permanent menu without replacing staff edits."""

from collections.abc import Iterable, Mapping
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Product


def add_uploaded_products(db: Session, rows: Iterable[Mapping[str, Any]]) -> tuple[int, int]:
    known_names = {" ".join(name.split()).casefold() for name in db.scalars(select(Product.item_name))}
    seen: set[str] = set()
    added = existing = 0
    for row in rows:
        name = " ".join(row["item_name"].split())
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        if key in known_names:
            existing += 1
            continue
        db.add(Product(item_name=name, current_price=row["sales_price"], available=False))
        known_names.add(key)
        added += 1
    return added, existing
