"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import configure_logging
from app.api.routes.analytics import router as analytics_router
from app.api.routes.uploads import router as uploads_router
from app.api.routes.store import staff_router, store_router
from app.db.database import Base, engine
from app.db import models  # noqa: F401 - registers ORM models with Base


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    description="Bakery sales management and analytics API.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

api_router = APIRouter(prefix=settings.api_prefix)
api_router.include_router(uploads_router)
api_router.include_router(analytics_router)
api_router.include_router(store_router)
api_router.include_router(staff_router)
app.include_router(api_router)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    """Simple process health endpoint for local checks and deployment probes."""
    return {"status": "ok", "app": settings.app_name}
