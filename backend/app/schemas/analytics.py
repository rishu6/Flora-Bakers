from pydantic import BaseModel


class DashboardResponse(BaseModel):
    upload_id: int
    currency: str
    filters: dict
    available_items: list[str]
    summary: dict
    top_items: list[dict]
    item_share: list[dict]
    sales_by_day: list[dict]
    sales_by_time: list[dict]
    hourly_sales: list[dict]
    trends: list[dict]
    products: list[dict]
    waste: dict
    insights: list[str]
    recommendations: list[str]
