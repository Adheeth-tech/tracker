"""Payment tracking & invoicing (spec 4.7)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import ensure_active_driver, get_current_user, require_roles
from app.core.database import get_db
from app.core.enums import PaymentStatus, RequestStatus, Role
from app.models.billing import Invoice, Payment
from app.models.trip import Trip
from app.models.user import User
from app.schemas.ops import (
    InvoiceGenerate,
    InvoiceOut,
    PaymentIn,
    PaymentOut,
)
from app.services import audit
from app.services.billing import generate_monthly_invoice, price_trip
from app.services.notifications import notify

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("/trip/{trip_id}", response_model=PaymentOut)
def get_trip_payment(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ensure_active_driver(user)
    payment = db.scalars(select(Payment).where(Payment.trip_id == trip_id)).first()
    if not payment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No payment for trip")
    return payment


@router.post("/trip/{trip_id}", response_model=PaymentOut)
def upsert_payment(
    trip_id: int,
    payload: PaymentIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.DRIVER, Role.ADMIN, Role.HOTEL)),
):
    """Create or update the payment record for a trip."""
    trip = db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")

    if user.role == Role.DRIVER and trip.driver_id != user.driver_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your trip")
    ensure_active_driver(user)
    if payload.payment_status == PaymentStatus.PAID and user.role != Role.ADMIN:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Only an administrator can approve and finalize a payment",
        )

    payment = trip.payment or Payment(trip_id=trip.id)
    litres = trip.quantity.collected_litres if trip.quantity else None
    if litres is not None:
        rate, amount = price_trip(litres, payload.rate_per_litre)
        payment.rate_per_litre = rate
        payment.quantity_litres = litres
        payment.amount = amount

    payment.payment_mode = payload.payment_mode
    payment.payment_status = payload.payment_status
    payment.transaction_id = payload.transaction_id
    if payload.payment_status == PaymentStatus.PAID:
        payment.paid_at = datetime.now(timezone.utc)
        if trip.request:
            trip.request.status = RequestStatus.PAID

    if trip.payment is None:
        db.add(payment)

    if payment.payment_status != PaymentStatus.PAID:
        notify(db, event="payment_pending")

    audit.record(db, action="payment_updated", entity_type="trip", entity_id=trip.id,
                 actor_user_id=user.id, actor_role=user.role.value,
                 detail=f"status={payload.payment_status.value}")
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/pending", response_model=list[PaymentOut])
def pending(db: Session = Depends(get_db), user: User = Depends(require_roles(Role.ADMIN))):
    return list(db.scalars(select(Payment).where(Payment.payment_status != PaymentStatus.PAID)))


@router.post("/invoices/generate", response_model=InvoiceOut)
def generate_invoice(
    payload: InvoiceGenerate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN)),
):
    invoice = generate_monthly_invoice(
        db, hotel_id=payload.hotel_id,
        period_start=payload.period_start, period_end=payload.period_end,
    )
    audit.record(db, action="invoice_generated", entity_type="invoice", entity_id=invoice.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    notify(db, event="invoice_generated")
    db.commit()
    db.refresh(invoice)
    return invoice


@router.get("/invoices", response_model=list[InvoiceOut])
def list_invoices(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Invoice).order_by(Invoice.id.desc())
    if user.role == Role.HOTEL:
        stmt = stmt.where(Invoice.hotel_id == user.hotel_id)
    return list(db.scalars(stmt))
