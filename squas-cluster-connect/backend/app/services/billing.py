"""Billing: per-trip pricing and hotel-wise monthly invoice generation (spec 4.7)."""
from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.enums import InvoiceStatus, PaymentStatus
from app.models.billing import Invoice, Payment
from app.models.trip import Trip
from app.services.codes import next_invoice_code


def price_trip(collected_litres: float, rate_per_litre: float | None = None) -> tuple[float, float]:
    """Return (rate, amount) for a collected quantity."""
    rate = rate_per_litre if rate_per_litre is not None else settings.default_rate_per_litre
    return rate, round(collected_litres * rate, 2)


def generate_monthly_invoice(
    db: Session, *, hotel_id: int, period_start: date, period_end: date
) -> Invoice:
    """Roll all paid/unpaid trip payments for a hotel in a period into one invoice."""
    stmt = (
        select(Payment)
        .join(Trip, Payment.trip_id == Trip.id)
        .join(Trip.request)
        .where(
            Payment.invoice_id.is_(None),
            Trip.request.has(hotel_id=hotel_id),
        )
    )
    payments = list(db.scalars(stmt))

    total_amount = sum(p.amount or 0.0 for p in payments)
    total_litres = sum(p.quantity_litres or 0.0 for p in payments)

    invoice = Invoice(
        invoice_code=next_invoice_code(db),
        hotel_id=hotel_id,
        period_start=period_start,
        period_end=period_end,
        total_litres=round(total_litres, 2),
        total_amount=round(total_amount, 2),
        trip_count=len(payments),
        status=InvoiceStatus.ISSUED,
    )
    db.add(invoice)
    db.flush()  # get invoice.id

    for p in payments:
        p.invoice_id = invoice.id

    return invoice


def pending_payments_total(db: Session) -> float:
    stmt = select(Payment).where(Payment.payment_status != PaymentStatus.PAID)
    return round(sum((p.amount or 0.0) for p in db.scalars(stmt)), 2)
