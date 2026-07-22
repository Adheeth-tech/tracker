"""Human-facing identifier generation (REQ-…, TRIP-…, INV-…, BATCH-…).

Spec 4.2 requires each request to carry a unique request ID. We give trips,
invoices and treatment batches the same treatment for auditability.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.billing import Invoice
from app.models.pickup_request import PickupRequest
from app.models.treatment import TreatmentBatch
from app.models.trip import Trip


def _year() -> int:
    return datetime.now(timezone.utc).year


def _next_code(db: Session, model, column, prefix: str) -> str:
    count = db.scalar(select(func.count()).select_from(model)) or 0
    return f"{prefix}-{_year()}-{count + 1:06d}"


def next_request_code(db: Session) -> str:
    return _next_code(db, PickupRequest, PickupRequest.request_code, "REQ")


def next_trip_code(db: Session) -> str:
    return _next_code(db, Trip, Trip.trip_code, "TRIP")


def next_invoice_code(db: Session) -> str:
    return _next_code(db, Invoice, Invoice.invoice_code, "INV")


def next_batch_code(db: Session) -> str:
    return _next_code(db, TreatmentBatch, TreatmentBatch.batch_code, "BATCH")
