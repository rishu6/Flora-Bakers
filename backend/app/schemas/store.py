"""Request and response contracts for the storefront and staff tools."""

from datetime import datetime

from pydantic import BaseModel, Field


class StaffLogin(BaseModel):
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=300)


class ProductInput(BaseModel):
    item_name: str = Field(min_length=1, max_length=200)
    current_price: float = Field(ge=0, le=1_000_000)
    available: bool = False


class ProductResponse(ProductInput):
    id: int


class OrderLineInput(BaseModel):
    product_id: int = Field(gt=0)
    quantity: int = Field(gt=0, le=100)


class CustomerOrderInput(BaseModel):
    customer_name: str = Field(min_length=1, max_length=160)
    customer_phone: str = Field(min_length=5, max_length=40)
    pickup_at: datetime | None = None
    items: list[OrderLineInput] = Field(min_length=1, max_length=50)


class StaffOrderInput(CustomerOrderInput):
    payment_status: str = Field(default="pending", pattern="^(pending|paid)$")


class OrderStatusInput(BaseModel):
    status: str = Field(pattern="^(new|confirmed|preparing|ready|completed|cancelled)$")
    payment_status: str | None = Field(default=None, pattern="^(pending|paid|refunded)$")


class FeedbackInput(BaseModel):
    product_name: str = Field(min_length=1, max_length=200)
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=2000)


class FeedbackResponse(FeedbackInput):
    id: int
    order_id: int | None
    source: str
    created_at: datetime
