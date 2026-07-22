"""Payment and Invoice entities — spec 4.7 and section 6."""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    Enum as SAEnum,
    Float,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.enums import InvoiceStatus, PaymentMode, PaymentStatus
from app.models.base import TimestampMixin


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id"), unique=True, index=True)

    rate_per_litre: Mapped[float | None] = mapped_column(Float)
    quantity_litres: Mapped[float | None] = mapped_column(Float)
    amount: Mapped[float | None] = mapped_column(Float)
    payment_mode: Mapped[PaymentMode] = mapped_column(
        SAEnum(PaymentMode), default=PaymentMode.CASH
    )
    payment_status: Mapped[PaymentStatus] = mapped_column(
        SAEnum(PaymentStatus), default=PaymentStatus.UNPAID, index=True
    )
    transaction_id: Mapped[str | None] = mapped_column(String(120))
    receipt_url: Mapped[str | None] = mapped_column(String(500))
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    trip: Mapped["Trip"] = relationship(back_populates="payment")  # noqa: F821
    invoice_id: Mapped[int | None] = mapped_column(ForeignKey("invoices.id"))
    invoice: Mapped["Invoice | None"] = relationship(back_populates="payments")


class Invoice(Base, TimestampMixin):
    """Per-trip or monthly hotel-wise invoice (spec 4.7)."""
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    hotel_id: Mapped[int] = mapped_column(ForeignKey("hotels.id"), index=True)

    period_start: Mapped[date | None] = mapped_column(Date)
    period_end: Mapped[date | None] = mapped_column(Date)
    total_litres: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    trip_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[InvoiceStatus] = mapped_column(
        SAEnum(InvoiceStatus), default=InvoiceStatus.DRAFT, index=True
    )
    pdf_url: Mapped[str | None] = mapped_column(String(500))

    payments: Mapped[list["Payment"]] = relationship(back_populates="invoice")
