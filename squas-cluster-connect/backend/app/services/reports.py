"""Reporting & analytics (spec 4.9, 8-Admin analytics).

Returns plain dicts so a router can serialise to JSON, or an exporter can render
to PDF/Excel. Export adapters are intentionally left as thin hooks.
"""
from __future__ import annotations

from datetime import date, datetime, time, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.enums import PaymentStatus, TripStatus
from app.models.billing import Payment
from app.models.hotel import Hotel
from app.models.pickup_request import PickupRequest
from app.models.trip import QuantityRecord, Trip


def _day_bounds(day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time.min, tzinfo=timezone.utc)
    end = datetime.combine(day, time.max, tzinfo=timezone.utc)
    return start, end


def daily_collection(db: Session, day: date) -> dict:
    start, end = _day_bounds(day)
    litres = db.scalar(
        select(func.coalesce(func.sum(QuantityRecord.collected_litres), 0.0))
        .join(Trip, QuantityRecord.trip_id == Trip.id)
        .where(Trip.collected_at.between(start, end))
    )
    trips = db.scalar(
        select(func.count()).select_from(Trip).where(Trip.collected_at.between(start, end))
    )
    revenue = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0.0))
        .join(Trip, Payment.trip_id == Trip.id)
        .where(Trip.collected_at.between(start, end))
    )
    return {
        "date": day.isoformat(),
        "total_litres": round(litres or 0.0, 2),
        "trips_completed": trips or 0,
        "revenue": round(revenue or 0.0, 2),
    }


def hotel_wise(db: Session) -> list[dict]:
    rows = db.execute(
        select(
            Hotel.id,
            Hotel.hotel_name,
            func.count(QuantityRecord.id),
            func.coalesce(func.sum(QuantityRecord.collected_litres), 0.0),
        )
        .select_from(Hotel)
        .outerjoin(PickupRequest, PickupRequest.hotel_id == Hotel.id)
        .outerjoin(Trip, Trip.request_id == PickupRequest.id)
        .outerjoin(QuantityRecord, QuantityRecord.trip_id == Trip.id)
        .group_by(Hotel.id, Hotel.hotel_name)
    ).all()
    return [
        {
            "hotel_id": r[0],
            "hotel_name": r[1],
            "trips": r[2],
            "total_litres": round(r[3] or 0.0, 2),
        }
        for r in rows
    ]


def fleet_summary(db: Session) -> dict:
    active_trips = db.scalar(
        select(func.count()).select_from(Trip).where(
            Trip.status.not_in([TripStatus.CLOSED, TripStatus.CANCELLED])
        )
    )
    pending_amount = db.scalar(
        select(func.coalesce(func.sum(Payment.amount), 0.0)).where(
            Payment.payment_status != PaymentStatus.PAID
        )
    )
    return {
        "active_trips": active_trips or 0,
        "pending_payment_amount": round(pending_amount or 0.0, 2),
    }
