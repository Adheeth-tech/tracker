"""Driver and Vehicle entities — spec 4.3 and section 6 field lists."""
from __future__ import annotations

from datetime import date

from sqlalchemy import Date, Enum as SAEnum, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import DriverStatus, VehicleStatus
from app.models.base import TimestampMixin


class Driver(Base, TimestampMixin):
    __tablename__ = "drivers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(20), index=True)
    license_number: Mapped[str | None] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(default=True)
    status: Mapped[DriverStatus] = mapped_column(
        SAEnum(DriverStatus), default=DriverStatus.PENDING, index=True
    )

    user: Mapped["User | None"] = relationship(back_populates="driver")  # noqa: F821
    vehicle: Mapped["Vehicle | None"] = relationship(  # noqa: F821
        back_populates="driver", uselist=False
    )
    trips: Mapped[list["Trip"]] = relationship(back_populates="driver")  # noqa: F821


class Vehicle(Base, TimestampMixin):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True)
    vehicle_number: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    capacity_litres: Mapped[float] = mapped_column(Float)
    gps_device_id: Mapped[str | None] = mapped_column(String(60))
    status: Mapped[VehicleStatus] = mapped_column(
        SAEnum(VehicleStatus), default=VehicleStatus.AVAILABLE, index=True
    )
    insurance_expiry: Mapped[date | None] = mapped_column(Date)
    fitness_expiry: Mapped[date | None] = mapped_column(Date)
    last_service_date: Mapped[date | None] = mapped_column(Date)

    # last known position for the live map (spec 4.4)
    last_lat: Mapped[float | None] = mapped_column(Float)
    last_lng: Mapped[float | None] = mapped_column(Float)

    driver_id: Mapped[int | None] = mapped_column(ForeignKey("drivers.id"))
    driver: Mapped["Driver | None"] = relationship(back_populates="vehicle")

    trips: Mapped[list["Trip"]] = relationship(back_populates="vehicle")  # noqa: F821
