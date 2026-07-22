"""Treatment centre receipt & batch linkage (spec 4.8).

Records plant-side received quantity, links the trip to a treatment batch, and
reconciles hotel-side vs plant-side quantity (variance).
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.database import get_db
from app.core.enums import Role
from app.models.treatment import PlantReceipt, TreatmentBatch
from app.models.trip import Trip
from app.models.user import User
from app.schemas.ops import PlantReceiptIn, PlantReceiptOut
from app.services import audit
from app.services.codes import next_batch_code
from app.services.notifications import notify

router = APIRouter(prefix="/treatment", tags=["treatment"])
_operator = require_roles(Role.TREATMENT, Role.ADMIN)


def _get_or_create_batch(db: Session, batch_code: str | None) -> TreatmentBatch:
    if batch_code:
        batch = db.scalars(
            select(TreatmentBatch).where(TreatmentBatch.batch_code == batch_code)
        ).first()
        if batch:
            return batch
    batch = TreatmentBatch(
        batch_code=batch_code or next_batch_code(db),
        opened_at=datetime.now(timezone.utc),
    )
    db.add(batch)
    db.flush()
    return batch


@router.post("/trips/{trip_id}/receipt", response_model=PlantReceiptOut)
def record_receipt(
    trip_id: int,
    payload: PlantReceiptIn,
    db: Session = Depends(get_db),
    user: User = Depends(_operator),
):
    trip = db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    if trip.plant_receipt is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Receipt already recorded")

    batch = _get_or_create_batch(db, payload.batch_code)
    now = datetime.now(timezone.utc)

    receipt = PlantReceipt(
        trip_id=trip.id,
        batch_id=batch.id,
        received_litres=payload.received_litres,
        unloaded_at=now,
        operator_user_id=user.id,
        remarks=payload.remarks,
    )
    db.add(receipt)

    batch.total_received_litres = (batch.total_received_litres or 0.0) + payload.received_litres

    # Reconcile hotel-side vs plant-side quantity (spec 4.6 variance).
    if trip.quantity is not None:
        trip.quantity.plant_received_litres = payload.received_litres
        if trip.quantity.collected_litres is not None:
            trip.quantity.variance_litres = round(
                trip.quantity.collected_litres - payload.received_litres, 2
            )

    audit.record(db, action="plant_receipt_recorded", entity_type="trip", entity_id=trip.id,
                 actor_user_id=user.id, actor_role=user.role.value,
                 detail=f"received={payload.received_litres} batch={batch.batch_code}")
    notify(db, event="plant_receipt_confirmed")
    db.commit()
    db.refresh(receipt)
    return receipt
