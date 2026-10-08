"""Typed application settings loaded from environment variables."""

from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import NoDecode
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    app_name: str = "Flora Bakes"
    environment: str = "development"
    api_prefix: str = "/api"
    database_url: str = "sqlite:///./flora_bakes.db"
    secret_key: SecretStr = SecretStr("development-only-change-me")
    staff_username: str = ""
    staff_password: SecretStr = SecretStr("")
    cors_origins: Annotated[list[str], NoDecode] = Field(default_factory=lambda: ["http://localhost:5173"])
    max_upload_size_mb: int = Field(default=20, ge=1, le=100)
    upload_directory: Path = Path("uploads")

    model_config = SettingsConfigDict(
        env_file=(ROOT_DIR / ".env", ROOT_DIR / "backend" / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    """Return cached settings so the app has one consistent configuration."""
    return Settings()


settings = get_settings()
