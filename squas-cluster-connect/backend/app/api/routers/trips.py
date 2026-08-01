"""Trip execution: driver status updates + quantity recording (spec 4.5, 4.6).

All status changes go through the workflow engine so timestamps, GPS logs,
request-status roll-up and notifications stay consistent.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.core.enums import RequestStatus, Role, TripStatus, VehicleStatus
from app.models.trip import LocationLog, QuantityRecord, Trip
from app.models.pickup_request import PickupRequest
from app.models.user import User
from app.schemas.ops import QuantityIn, QuantityOut, TripAdvance, TripOut
from app.services import audit
from app.services.billing import price_trip
from app.services.notifications import notify, notify_hotel, notify_role
from app.workflow import trip_state_machine as sm

router = APIRouter(prefix="/trips", tags=["trips"])


def _load_trip_for_driver(db: Session, trip_id: int, user: User) -> Trip:
    trip = db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    if user.role == Role.DRIVER and trip.driver_id != user.driver_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your trip")
    return trip


@router.get("", response_model=list[TripOut])
def list_trips(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    only_active: bool = False,
):
    stmt = (
        select(Trip)
        .options(
            joinedload(Trip.request).joinedload(PickupRequest.hotel),
            joinedload(Trip.vehicle),
            joinedload(Trip.payment),
            joinedload(Trip.quantity),
        )
        .order_by(Trip.id.desc())
    )
    if user.role == Role.DRIVER:
        stmt = stmt.where(Trip.driver_id == user.driver_id)
    elif user.role == Role.HOTEL:
        stmt = stmt.join(Trip.request).where(PickupRequest.hotel_id == user.hotel_id)
    if only_active:
        stmt = stmt.where(Trip.status.not_in([TripStatus.CLOSED, TripStatus.CANCELLED]))
    return list(db.scalars(stmt))


def _load_trip_detail(db: Session, trip_id: int) -> Trip:
    stmt = (
        select(Trip)
        .where(Trip.id == trip_id)
        .options(
            joinedload(Trip.request).joinedload(PickupRequest.hotel),
            joinedload(Trip.vehicle),
            joinedload(Trip.payment),
            joinedload(Trip.quantity),
        )
    )
    trip = db.scalars(stmt).first()
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    return trip


@router.get("/{trip_id}", response_model=TripOut)
def get_trip(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _load_trip_detail(db, trip_id)


@router.get("/{trip_id}/next-states")
def next_states(trip_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    trip = db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    return {"current": trip.status.value, "allowed": [s.value for s in sm.allowed_next(trip.status)]}


@router.post("/{trip_id}/advance", response_model=TripOut)
def advance_trip(
    trip_id: int,
    payload: TripAdvance,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.DRIVER, Role.ADMIN)),
):
    """Move a trip to the next status. Captures GPS + timestamp per spec 4.5."""
    trip = _load_trip_for_driver(db, trip_id, user)
    now = datetime.now(timezone.utc)

    if payload.target == TripStatus.DRIVER_STARTED and trip.accepted_at is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Driver must accept the assignment before starting the trip")

    try:
        sm.apply_transition(trip, payload.target, at=now)
    except sm.InvalidTransition as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc))

    # Record a GPS breadcrumb for this status change.
    if payload.location:
        db.add(LocationLog(
            trip_id=trip.id,
            vehicle_id=trip.vehicle_id,
            latitude=payload.location.latitude,
            longitude=payload.location.longitude,
            speed=payload.location.speed,
            status=payload.target.value,
            timestamp=now,
        ))
        if trip.vehicle:
            trip.vehicle.last_lat = payload.location.latitude
            trip.vehicle.last_lng = payload.location.longitude
            trip.vehicle.last_location_at = now

    audit.record(db, action="trip_status_change", entity_type="trip", entity_id=trip.id,
                 actor_user_id=user.id, actor_role=user.role.value,
                 detail=f"-> {payload.target.value}")

    event = sm.event_for(payload.target)
    if event:
        if trip.request:
            notify_hotel(db, trip.request.hotel_id, event=event)
        notify_role(db, Role.ADMIN, event=event)

    db.commit()
    return _load_trip_detail(db, trip.id)


@router.post("/{trip_id}/accept", response_model=TripOut)
def accept_trip(trip_id: int, db: Session = Depends(get_db),
                 user: User = Depends(require_roles(Role.DRIVER))):
    trip = _load_trip_for_driver(db, trip_id, user)
    if trip.status != TripStatus.ASSIGNED or trip.accepted_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Trip is not awaiting acceptance")
    trip.accepted_at = datetime.now(timezone.utc)
    audit.record(db, action="trip_accepted", entity_type="trip", entity_id=trip.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    notify_role(db, Role.ADMIN, event="driver_accepted")
    if trip.request:
        notify_hotel(db, trip.request.hotel_id, event="driver_accepted")
    db.commit()
    return _load_trip_detail(db, trip.id)


@router.post("/{trip_id}/decline", response_model=TripOut)
def decline_trip(trip_id: int, db: Session = Depends(get_db),
                  user: User = Depends(require_roles(Role.DRIVER))):
    trip = _load_trip_for_driver(db, trip_id, user)
    if trip.status != TripStatus.ASSIGNED or trip.accepted_at is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Trip cannot be declined at this stage")
    trip.status = TripStatus.CANCELLED
    if trip.vehicle:
        trip.vehicle.status = VehicleStatus.AVAILABLE
    if trip.request:
        trip.request.status = RequestStatus.APPROVED  # back in pool for assignment
    audit.record(db, action="trip_declined", entity_type="trip", entity_id=trip.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    notify_role(db, Role.ADMIN, event="driver_declined")
    db.commit()
    return _load_trip_detail(db, trip.id)


@router.post("/{trip_id}/quantity", response_model=QuantityOut)
def record_quantity(
    trip_id: int,
    payload: QuantityIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.DRIVER, Role.ADMIN, Role.HOTEL)),
):
    """Record/confirm collected quantity (spec 4.6) and price the trip (spec 4.7)."""
    trip = db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")

    if user.role == Role.DRIVER and trip.driver_id != user.driver_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your trip")

    rec = trip.quantity or QuantityRecord(trip_id=trip.id)
    if rec.estimated_litres is None and trip.request:
        rec.estimated_litres = trip.request.estimated_litres

    if payload.driver_entered_litres is not None:
        rec.driver_entered_litres = payload.driver_entered_litres
    if payload.hotel_confirmed_litres is not None:
        rec.hotel_confirmed_litres = payload.hotel_confirmed_litres
    if payload.source is not None:
        rec.source = payload.source
    if payload.proof_photo_url is not None:
        rec.proof_photo_url = payload.proof_photo_url
    if payload.variance_remarks is not None:
        rec.variance_remarks = payload.variance_remarks

    # Source of truth for billing: explicit collected_litres, else driver entry.
    collected = payload.collected_litres
    if collected is None:
        collected = payload.driver_entered_litres
    if collected is not None:
        rec.collected_litres = collected

    # Variance vs estimate.
    if rec.collected_litres is not None and rec.estimated_litres is not None:
        rec.variance_litres = round(rec.collected_litres - rec.estimated_litres, 2)

    if trip.quantity is None:
        db.add(rec)

    # Price the trip if we now have a collected quantity and no payment yet.
    if rec.collected_litres is not None and trip.payment is None:
        from app.models.billing import Payment  # local import avoids cycle at top
        rate, amount = price_trip(rec.collected_litres)
        db.add(Payment(
            trip_id=trip.id,
            rate_per_litre=rate,
            quantity_litres=rec.collected_litres,
            amount=amount,
        ))

    audit.record(db, action="quantity_recorded", entity_type="trip", entity_id=trip.id,
                 actor_user_id=user.id, actor_role=user.role.value,
                 detail=f"collected={rec.collected_litres}")
    db.commit()
    db.refresh(rec)
    return rec


@router.delete("/{trip_id}", status_code=204)
def delete_trip(
    trip_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN)),
):
    from sqlalchemy import delete
    from app.models.billing import Payment
    from app.models.treatment import PlantReceipt
    
    trip = db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")

    # If vehicle is on this trip, restore status to available
    if trip.vehicle and trip.vehicle.status == VehicleStatus.ON_TRIP:
        trip.vehicle.status = VehicleStatus.AVAILABLE

    # 1. Delete associated Location Logs
    db.execute(delete(LocationLog).where(LocationLog.trip_id == trip_id))

    # 2. Delete associated Quantity Records
    db.execute(delete(QuantityRecord).where(QuantityRecord.trip_id == trip_id))

    # 3. Delete associated Payment Records
    db.execute(delete(Payment).where(Payment.trip_id == trip_id))

    # 4. Delete associated Plant Receipts
    db.execute(delete(PlantReceipt).where(PlantReceipt.trip_id == trip_id))

    # 5. Delete parent request to start completely fresh
    req_id = trip.request_id
    
    db.delete(trip)
    db.flush()

    if req_id:
        req = db.get(PickupRequest, req_id)
        if req:
            db.delete(req)

    audit.record(db, action="trip_deleted", entity_type="trip", entity_id=trip_id,
                 actor_user_id=user.id, actor_role=user.role.value)
    
    db.commit()
    return
