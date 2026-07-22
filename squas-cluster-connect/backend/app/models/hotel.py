"""Hotel entity — spec 4.1 registration and section 6 field list."""
from __future__ import annotations

from sqlalchemy import Enum as SAEnum, Float, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import HotelStatus, PaymentMode
from app.models.base import TimestampMixin


class Hotel(Base, TimestampMixin):
    __tablename__ = "hotels"

    id: Mapped[int] = mapped_column(primary_key=True)
    hotel_name: Mapped[str] = mapped_column(String(200), index=True)
    contact_person: Mapped[str | None] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(String(400))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    gst_number: Mapped[str | None] = mapped_column(String(20))

    tank_location: Mapped[str | None] = mapped_column(String(300))
    tank_capacity: Mapped[float | None] = mapped_column(Float)     # litres
    usual_volume: Mapped[float | None] = mapped_column(Float)      # daily litres
    usual_pickup_time: Mapped[str | None] = mapped_column(String(50))
    payment_type: Mapped[PaymentMode] = mapped_column(
        SAEnum(PaymentMode), default=PaymentMode.CASH
    )

    status: Mapped[HotelStatus] = mapped_column(
        SAEnum(HotelStatus), default=HotelStatus.PENDING, index=True
    )

    users: Mapped[list["User"]] = relationship(back_populates="hotel")  # noqa: F821
    requests: Mapped[list["PickupRequest"]] = relationship(  # noqa: F821
        back_populates="hotel"
    )
