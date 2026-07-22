"""Pickup request entity — spec 4.2 and section 6 field list."""
from __future__ import annotations

from datetime import date

from sqlalchemy import Date, Enum as SAEnum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import RequestStatus, Urgency, WastewaterType
from app.models.base import TimestampMixin


class PickupRequest(Base, TimestampMixin):
    __tablename__ = "pickup_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    # Human-facing unique request ID, e.g. "REQ-2026-000123" (spec 4.2).
    request_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)

    hotel_id: Mapped[int] = mapped_column(ForeignKey("hotels.id"), index=True)

    requested_date: Mapped[date | None] = mapped_column(Date)
    time_window: Mapped[str | None] = mapped_column(String(50))
    estimated_litres: Mapped[float | None] = mapped_column(Float)
    wastewater_type: Mapped[WastewaterType] = mapped_column(
        SAEnum(WastewaterType), default=WastewaterType.MIXED
    )
    access_instructions: Mapped[str | None] = mapped_column(Text)
    remarks: Mapped[str | None] = mapped_column(Text)
    urgency: Mapped[Urgency] = mapped_column(SAEnum(Urgency), default=Urgency.NORMAL)

    status: Mapped[RequestStatus] = mapped_column(
        SAEnum(RequestStatus), default=RequestStatus.REQUESTED, index=True
    )

    hotel: Mapped["Hotel"] = relationship(back_populates="requests")  # noqa: F821
    trip: Mapped["Trip | None"] = relationship(  # noqa: F821
        back_populates="request", uselist=False
    )
