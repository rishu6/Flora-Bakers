"""Public ordering and authenticated bakery staff operations."""

from __future__ import annotations

import secrets
from io import BytesIO
from collections import defaultdict
from pathlib import Path
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, Request, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.auth import SESSION_COOKIE, SESSION_SECONDS, issue_session, require_staff
from app.core.config import settings
from app.db.database import get_db
from app.db.models import CustomerFeedback, CustomerOrder, CustomerOrderItem, Product
from app.schemas.store import BulkProductInput, CustomerOrderInput, FeedbackInput, OrderStatusInput, ProductInput, StaffLogin, StaffOrderInput

store_router = APIRouter(prefix="/store", tags=["storefront"])
staff_router = APIRouter(prefix="/staff", tags=["staff"])


def _product(product: Product) -> dict[str, Any]:
    return {"id": product.id, "item_name": product.item_name, "current_price": product.current_price, "available": product.available}


def _order(order: CustomerOrder) -> dict[str, Any]:
    return {
        "id": order.id,
        "public_code": order.public_code,
        "customer_name": order.customer_name,
        "customer_phone": order.customer_phone,
        "pickup_at": order.pickup_at,
        "channel": order.channel,
        "status": order.status,
        "payment_status": order.payment_status,
        "total": order.total,
        "created_at": order.created_at,
        "items": [{"product_name": item.product_name, "quantity": item.quantity, "unit_price": item.unit_price, "line_total": item.line_total} for item in order.items],
    }


def _create_order(db: Session, request_data: CustomerOrderInput, *, channel: str, payment_status: str) -> CustomerOrder:
    requested_ids = {line.product_id for line in request_data.items}
    products = db.scalars(select(Product).where(Product.id.in_(requested_ids))).all()
    by_id = {product.id: product for product in products}
    if len(by_id) != len(requested_ids) or any(not product.available for product in products):
        raise HTTPException(409, "One or more selected products are unavailable. Refresh the menu and try again.")

    order = CustomerOrder(
        public_code=secrets.token_urlsafe(12),
        customer_name=request_data.customer_name.strip(),
        customer_phone=request_data.customer_phone.strip(),
        pickup_at=request_data.pickup_at,
        channel=channel,
        status="new",
        payment_status=payment_status,
        total=0,
    )
    total = 0.0
    for line in request_data.items:
        product = by_id[line.product_id]
        line_total = round(product.current_price * line.quantity, 2)
        total += line_total
        order.items.append(CustomerOrderItem(product_name=product.item_name, quantity=line.quantity, unit_price=product.current_price, line_total=line_total))
    order.total = round(total, 2)
    db.add(order)
    db.commit()
    db.refresh(order)
    return db.scalar(select(CustomerOrder).options(selectinload(CustomerOrder.items)).where(CustomerOrder.id == order.id)) or order


@store_router.get("/products")
def public_products(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = db.scalars(select(Product).where(Product.available.is_(True)).order_by(Product.item_name)).all()
    return [_product(row) for row in rows]


@store_router.post("/orders", status_code=status.HTTP_201_CREATED)
def customer_order(data: CustomerOrderInput, db: Session = Depends(get_db)) -> dict[str, Any]:
    order = _create_order(db, data, channel="customer", payment_status="pending")
    return _order(order)


@store_router.get("/orders/{public_code}")
def public_order_status(public_code: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    order = db.scalar(select(CustomerOrder).options(selectinload(CustomerOrder.items)).where(CustomerOrder.public_code == public_code))
    if order is None:
        raise HTTPException(404, "Order not found.")
    return {"public_code": order.public_code, "status": order.status, "payment_status": order.payment_status, "pickup_at": order.pickup_at, "total": order.total, "items": [{"product_name": item.product_name, "quantity": item.quantity, "line_total": item.line_total} for item in order.items]}


@store_router.post("/orders/{public_code}/feedback", status_code=status.HTTP_201_CREATED)
def order_feedback(public_code: str, data: FeedbackInput, db: Session = Depends(get_db)) -> dict[str, str]:
    order = db.scalar(select(CustomerOrder).options(selectinload(CustomerOrder.items), selectinload(CustomerOrder.feedback)).where(CustomerOrder.public_code == public_code))
    if order is None or order.status != "completed":
        raise HTTPException(404, "Feedback is available after the bakery marks the order complete.")
    ordered_names = {item.product_name.casefold() for item in order.items}
    if data.product_name.casefold() not in ordered_names:
        raise HTTPException(422, "Choose an item included in this order.")
    if any(feedback.product_name.casefold() == data.product_name.casefold() for feedback in order.feedback):
        raise HTTPException(409, "Feedback has already been submitted for this item.")
    db.add(CustomerFeedback(order_id=order.id, product_name=data.product_name.strip(), rating=data.rating, comment=data.comment.strip(), source="order"))
    db.commit()
    return {"status": "Thank you for sharing your feedback."}


@staff_router.post("/login")
def staff_login(data: StaffLogin, response: Response) -> dict[str, str]:
    username = settings.staff_username
    password = settings.staff_password.get_secret_value()
    if not username or not password:
        raise HTTPException(503, "Staff sign-in is not configured. Set STAFF_USERNAME and STAFF_PASSWORD on the backend service.")
    if not secrets.compare_digest(data.username, username) or not secrets.compare_digest(data.password, password):
        raise HTTPException(401, "The username or password is incorrect.")
    production = settings.environment.lower() not in {"development", "local"}
    response.set_cookie(
        SESSION_COOKIE,
        issue_session(username),
        max_age=SESSION_SECONDS,
        httponly=True,
        secure=production,
        samesite="none" if production else "lax",
        path="/api",
    )
    return {"username": username}


@staff_router.post("/logout")
def staff_logout(response: Response) -> dict[str, str]:
    response.delete_cookie(SESSION_COOKIE, path="/api", secure=settings.environment.lower() not in {"development", "local"}, httponly=True, samesite="none" if settings.environment.lower() not in {"development", "local"} else "lax")
    return {"status": "signed out"}


@staff_router.get("/session")
def staff_session(username: str = Depends(require_staff)) -> dict[str, str]:
    return {"username": username}


@staff_router.get("/products")
def staff_products(_: str = Depends(require_staff), db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    return [_product(row) for row in db.scalars(select(Product).order_by(Product.item_name)).all()]


@staff_router.post("/products")
def save_product(data: ProductInput, _: str = Depends(require_staff), db: Session = Depends(get_db)) -> dict[str, Any]:
    name = " ".join(data.item_name.split())
    product = db.scalar(select(Product).where(func.lower(Product.item_name) == name.lower()))
    if product is None:
        product = Product(item_name=name, current_price=data.current_price, available=data.available)
        db.add(product)
    else:
        product.current_price = data.current_price
        product.available = data.available
    db.commit()
    db.refresh(product)
    return _product(product)


@staff_router.put("/products/bulk")
def save_products_bulk(data: BulkProductInput, _: str = Depends(require_staff), db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    normalized_names = [" ".join(item.item_name.split()) for item in data.products]
    if any(not name for name in normalized_names):
        raise HTTPException(422, "Every menu item needs a product name.")
    if len({name.casefold() for name in normalized_names}) != len(normalized_names):
        raise HTTPException(422, "Each product name can appear only once in the menu.")

    existing = db.scalars(select(Product)).all()
    by_id = {product.id: product for product in existing}
    by_name = {product.item_name.casefold(): product for product in existing}
    results: list[Product] = []
    for item, name in zip(data.products, normalized_names):
        if item.id is not None and item.id not in by_id:
            raise HTTPException(404, "A menu item changed since this page loaded. Refresh the menu and try again.")
        product = by_id.get(item.id) if item.id is not None else by_name.get(name.casefold())
        name_owner = by_name.get(name.casefold())
        if name_owner is not None and name_owner is not product:
            raise HTTPException(409, f"A different menu item already uses the name ‘{name}’.")
        if product is None:
            product = Product(item_name=name, current_price=item.current_price, available=item.available)
            db.add(product)
        else:
            product.item_name = name
            product.current_price = item.current_price
            product.available = item.available
        by_name[name.casefold()] = product
        results.append(product)
    db.commit()
    for product in results:
        db.refresh(product)
    return [_product(product) for product in results]


@staff_router.post("/orders", status_code=status.HTTP_201_CREATED)
def staff_order(data: StaffOrderInput, _: str = Depends(require_staff), db: Session = Depends(get_db)) -> dict[str, Any]:
    order = _create_order(db, data, channel="staff", payment_status=data.payment_status)
    return _order(order)


@staff_router.get("/orders")
def staff_orders(_: str = Depends(require_staff), db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = db.scalars(select(CustomerOrder).options(selectinload(CustomerOrder.items)).order_by(CustomerOrder.created_at.desc())).all()
    return [_order(row) for row in rows]


@staff_router.patch("/orders/{order_id}")
def update_order(order_id: int, data: OrderStatusInput, _: str = Depends(require_staff), db: Session = Depends(get_db)) -> dict[str, Any]:
    order = db.scalar(select(CustomerOrder).options(selectinload(CustomerOrder.items)).where(CustomerOrder.id == order_id))
    if order is None:
        raise HTTPException(404, "Order not found.")
    order.status = data.status
    if data.payment_status:
        order.payment_status = data.payment_status
    db.commit()
    db.refresh(order)
    return _order(order)


@staff_router.get("/feedback")
def staff_feedback(_: str = Depends(require_staff), db: Session = Depends(get_db)) -> dict[str, Any]:
    rows = db.scalars(select(CustomerFeedback).order_by(CustomerFeedback.created_at.desc())).all()
    groups: dict[str, list[CustomerFeedback]] = defaultdict(list)
    for row in rows:
        groups[row.product_name].append(row)
    suggestions = []
    for name, entries in groups.items():
        average = sum(entry.rating for entry in entries) / len(entries)
        if len(entries) >= 2 and average < 3.5:
            suggestions.append({"item": name, "kind": "attention", "title": "Review this product", "detail": f"{len(entries)} feedback responses average {average:.1f}/5. Check recent comments for changes to freshness, consistency, or value."})
        elif len(entries) >= 2 and average >= 4.5:
            suggestions.append({"item": name, "kind": "promote", "title": "Customer favourite", "detail": f"{len(entries)} feedback responses average {average:.1f}/5. Consider featuring {name} in a promotion or seasonal bundle."})
    suggestions.sort(key=lambda suggestion: (suggestion["kind"] != "attention", suggestion["item"].casefold()))
    return {
        "responses": [{"id": row.id, "product_name": row.product_name, "rating": row.rating, "comment": row.comment, "source": row.source, "created_at": row.created_at} for row in rows],
        "suggestions": suggestions,
        "total_responses": len(rows),
    }


@staff_router.post("/feedback/import")
async def import_feedback(file: UploadFile = File(...), _: str = Depends(require_staff), db: Session = Depends(get_db)) -> dict[str, int]:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".xlsx", ".xls"}:
        raise HTTPException(400, "Upload an .xlsx or .xls feedback workbook.")
    contents = await file.read(settings.max_upload_size_mb * 1024 * 1024 + 1)
    if len(contents) > settings.max_upload_size_mb * 1024 * 1024:
        raise HTTPException(413, f"File exceeds the {settings.max_upload_size_mb} MB upload limit.")
    try:
        frame = pd.read_excel(BytesIO(contents), engine="openpyxl" if suffix == ".xlsx" else "xlrd")
    except Exception as exc:
        raise HTTPException(422, "Could not read this feedback workbook.") from exc
    columns = {" ".join(str(column).strip().lower().replace("_", " ").split()): column for column in frame.columns}
    product_column = next((columns[key] for key in ("item name", "item", "product", "product name") if key in columns), None)
    rating_column = next((columns[key] for key in ("rating", "score", "stars") if key in columns), None)
    comment_column = next((columns[key] for key in ("feedback", "comment", "review") if key in columns), None)
    if product_column is None or rating_column is None:
        raise HTTPException(422, "Feedback workbook needs Item Name and Rating columns. Feedback or Comment is optional.")
    imported = rejected = 0
    for _, row in frame.head(5000).iterrows():
        try:
            product_name = str(row[product_column]).strip()
            rating = int(row[rating_column])
            comment = "" if comment_column is None or pd.isna(row[comment_column]) else str(row[comment_column]).strip()[:2000]
            if not product_name or product_name.lower() == "nan" or not 1 <= rating <= 5:
                rejected += 1
                continue
            db.add(CustomerFeedback(product_name=product_name[:200], rating=rating, comment=comment, source="import"))
            imported += 1
        except (TypeError, ValueError, OverflowError):
            rejected += 1
    db.commit()
    return {"imported": imported, "rejected": rejected}
