"""Trip execution, quantity record and location log — spec 4.5, 4.6, 6."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import QuantitySource, TripStatus
from app.models.base import TimestampMixin


class Trip(Base, TimestampMixin):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)

    request_id: Mapped[int] = mapped_column(
        ForeignKey("pickup_requests.id"), unique=True, index=True
    )
    driver_id: Mapped[int] = mapped_column(ForeignKey("drivers.id"), index=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), index=True)

    status: Mapped[TripStatus] = mapped_column(
        SAEnum(TripStatus), default=TripStatus.ASSIGNED, index=True
    )

    # Milestone timestamps (spec section 6: Trip)
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    arrived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    collected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    loading_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivery_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    plant_received_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    request: Mapped["PickupRequest"] = relationship(back_populates="trip")  # noqa: F821
    driver: Mapped["Driver"] = relationship(back_populates="trips")  # noqa: F821
    vehicle: Mapped["Vehicle"] = relationship(back_populates="trips")  # noqa: F821

    quantity: Mapped["QuantityRecord | None"] = relationship(
        back_populates="trip", uselist=False
    )
    payment: Mapped["Payment | None"] = relationship(  # noqa: F821
        back_populates="trip", uselist=False
    )
    plant_receipt: Mapped["PlantReceipt | None"] = relationship(  # noqa: F821
        back_populates="trip", uselist=False
    )
    location_logs: Mapped[list["LocationLog"]] = relationship(back_populates="trip")


class QuantityRecord(Base, TimestampMixin):
    """Quantity measurement — spec 4.6. Multiple readings reconciled into one row."""
    __tablename__ = "quantity_records"

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"), unique=True)

    estimated_litres: Mapped[float | None] = mapped_column(Float)
    driver_entered_litres: Mapped[float | None] = mapped_column(Float)
    hotel_confirmed_litres: Mapped[float | None] = mapped_column(Float)
    plant_received_litres: Mapped[float | None] = mapped_column(Float)
    collected_litres: Mapped[float | None] = mapped_column(Float)  # source of truth
    variance_litres: Mapped[float | None] = mapped_column(Float)
    source: Mapped[QuantitySource] = mapped_column(
        SAEnum(QuantitySource), default=QuantitySource.MANUAL
    )
    proof_photo_url: Mapped[str | None] = mapped_column(String(500))
    variance_remarks: Mapped[str | None] = mapped_column(Text)

    trip: Mapped["Trip"] = relationship(back_populates="quantity")


class LocationLog(Base):
    """GPS breadcrumb captured on each status update / ping — spec 4.5, 6."""
    __tablename__ = "location_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int | None] = mapped_column(ForeignKey("trips.id"), index=True)
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id"), index=True)
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    speed: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str | None] = mapped_column(String(40))
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    trip: Mapped["Trip | None"] = relationship(back_populates="location_logs")
