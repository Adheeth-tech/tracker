"""User account and OTP models. Auth is OTP + role-based (spec section 8/10)."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import Role
from app.models.base import TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    phone: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(120))
    email: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(SAEnum(Role), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Optional links to the domain entity this user represents.
    hotel_id: Mapped[int | None] = mapped_column(ForeignKey("hotels.id"))
    driver_id: Mapped[int | None] = mapped_column(ForeignKey("drivers.id"))

    hotel: Mapped["Hotel | None"] = relationship(back_populates="users")  # noqa: F821
    driver: Mapped["Driver | None"] = relationship(back_populates="user")  # noqa: F821


class OtpCode(Base):
    """A one-time login code tied to a phone number."""
    __tablename__ = "otp_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    phone: Mapped[str] = mapped_column(String(20), index=True)
    code: Mapped[str] = mapped_column(String(8))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)
