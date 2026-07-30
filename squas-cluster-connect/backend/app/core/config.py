"""Central application configuration, loaded from environment / .env."""
from __future__ import annotations

from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    app_name: str = "Squas Cluster Connect"
    env: str = "development"
    secret_key: str = "dev-insecure-secret-change-me"
    access_token_expire_minutes: int = 1440
    algorithm: str = "HS256"

    # Database
    database_url: str | None = None
    dev_database_url: str = "sqlite:///./squas_new.db"
    prod_database_url: str = "sqlitecloud://cgshce9edk.g5.sqlite.cloud:8860/auth.sqlitecloud?apikey=uGHiUkUmiYz4b2GrggkebkN1SYawcpiGmvWFVwh6PnQ"

    # OTP auth
    otp_dev_echo: bool = True
    otp_ttl_seconds: int = 300
    dev_otp: str | None = "123456"

    # Billing
    default_rate_per_litre: float = 0.50

    @model_validator(mode="after")
    def set_database_url(self) -> Settings:
        if not self.database_url:
            if self.env == "production":
                self.database_url = self.prod_database_url
            else:
                self.database_url = self.dev_database_url
        return self

    @property
    def is_sqlite(self) -> bool:
        return self.database_url is not None and (
            self.database_url.startswith("sqlite://") or self.database_url.startswith("sqlite+pysqlite://")
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
