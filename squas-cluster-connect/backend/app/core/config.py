"""Central application configuration, loaded from environment / .env."""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "Squas Cluster Connect"
    env: str = "development"
    secret_key: str = "dev-insecure-secret-change-me"
    access_token_expire_minutes: int = 1440
    algorithm: str = "HS256"

    # Database — SQLite default keeps local dev zero-config; use Postgres in prod.
    database_url: str = "sqlite:///./squas_new.db"

    # OTP auth
    otp_dev_echo: bool = True
    otp_ttl_seconds: int = 300

    # Maps
    maps_provider: str = "google"
    maps_api_key: str = ""

    # Storage
    storage_bucket: str = "squas-proofs"
    storage_base_url: str = ""

    # Notifications
    fcm_server_key: str = ""
    sms_api_key: str = ""
    whatsapp_api_key: str = ""

    # Billing
    default_rate_per_litre: float = 0.50
    currency: str = "INR"

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
