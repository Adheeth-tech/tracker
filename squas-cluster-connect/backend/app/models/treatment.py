"""Treatment centre receipt and batch linkage — spec 4.8.

Establishes traceability: hotel -> tanker -> plant -> treatment batch.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin


class TreatmentBatch(Base, TimestampMixin):
    __tablename__ = "treatment_batches"

    id: Mapped[int] = mapped_column(primary_key=True)
    batch_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    opened_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    total_received_litres: Mapped[float] = mapped_column(Float, default=0.0)
    sludge_estimate_litres: Mapped[float | None] = mapped_column(Float)
    notes: Mapped[str | None] = mapped_column(Text)

    receipts: Mapped[list["PlantReceipt"]] = relationship(back_populates="batch")


class PlantReceipt(Base, TimestampMixin):
    """Recorded when a tanker unloads at the Squas plant (spec 4.8)."""
    __tablename__ = "plant_receipts"

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"), unique=True, index=True)
    batch_id: Mapped[int | None] = mapped_column(ForeignKey("treatment_batches.id"))

    received_litres: Mapped[float] = mapped_column(Float)
    unloaded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    operator_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    remarks: Mapped[str | None] = mapped_column(Text)

    trip: Mapped["Trip"] = relationship(back_populates="plant_receipt")  # noqa: F821
    batch: Mapped["TreatmentBatch | None"] = relationship(back_populates="receipts")
