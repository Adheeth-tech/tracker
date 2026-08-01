"""Pickup request lifecycle + tanker assignment (spec 4.2, 4.3)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.core.enums import DriverStatus, HotelStatus, RequestStatus, Role, TripStatus, VehicleStatus
from app.models.fleet import Driver, Vehicle
from app.models.hotel import Hotel
from app.models.pickup_request import PickupRequest
from app.models.trip import Trip
from app.models.user import User
from app.schemas.ops import (
    AssignmentRequest,
    PickupRequestCreate,
    PickupRequestOut,
    TripOut,
)
from app.services import audit
from app.services.assignment import auto_assign
from app.services.codes import next_request_code, next_trip_code
from app.services.notifications import notify, notify_driver, notify_hotel

router = APIRouter(prefix="/requests", tags=["requests"])


@router.post("", response_model=PickupRequestOut, status_code=201)
def create_request(
    payload: PickupRequestCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Hotel users raise requests for their own hotel; admins may specify hotel_id.
    hotel_id = payload.hotel_id
    if user.role == Role.HOTEL:
        hotel_id = user.hotel_id
        if not hotel_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Hotel account is not linked to a hotel")
        hotel = db.get(Hotel, hotel_id)
        if not hotel or hotel.status != HotelStatus.ACTIVE:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "Hotel registration is pending admin approval",
            )
    if not hotel_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "hotel_id required")

    req = PickupRequest(
        request_code=next_request_code(db),
        hotel_id=hotel_id,
        requested_date=payload.requested_date,
        time_window=payload.time_window,
        estimated_litres=payload.estimated_litres,
        wastewater_type=payload.wastewater_type,
        access_instructions=payload.access_instructions,
        remarks=payload.remarks,
        urgency=payload.urgency,
        status=RequestStatus.REQUESTED,
    )
    db.add(req)
    db.flush()
    audit.record(db, action="request_created", entity_type="request", entity_id=req.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    notify(db, event="request_submitted", recipient_user_id=user.id)
    db.commit()
    db.refresh(req)
    return req


@router.get("", response_model=list[PickupRequestOut])
def list_requests(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    status_filter: RequestStatus | None = None,
):
    stmt = select(PickupRequest).order_by(PickupRequest.id.desc())
    if user.role == Role.HOTEL:
        stmt = stmt.where(PickupRequest.hotel_id == user.hotel_id)
    if status_filter:
        stmt = stmt.where(PickupRequest.status == status_filter)
    return list(db.scalars(stmt))


@router.post("/{request_id}/approve", response_model=PickupRequestOut)
def approve_request(
    request_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN)),
):
    req = db.get(PickupRequest, request_id)
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    if req.status != RequestStatus.REQUESTED:
        raise HTTPException(status.HTTP_409_CONFLICT, f"Cannot approve from {req.status.value}")
    req.status = RequestStatus.APPROVED
    audit.record(db, action="request_approved", entity_type="request", entity_id=req.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    notify_hotel(db, req.hotel_id, event="request_approved")
    db.commit()
    db.refresh(req)
    return req


@router.post("/{request_id}/assign", response_model=TripOut)
def assign_request(
    request_id: int,
    payload: AssignmentRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN)),
):
    """Assign a vehicle+driver and open a Trip (spec 4.3). Creates the trip in ASSIGNED."""
    req = db.get(PickupRequest, request_id)
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Request not found")
    if req.status not in (RequestStatus.REQUESTED, RequestStatus.APPROVED):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Cannot assign from {req.status.value}")
    if req.trip is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Request already has a trip")

    # Resolve the vehicle.
    vehicle: Vehicle | None = None
    if payload.auto and not payload.vehicle_id:
        vehicle = auto_assign(db, req)
        if not vehicle:
            raise HTTPException(status.HTTP_409_CONFLICT, "No available vehicle to auto-assign")
    elif payload.vehicle_id:
        vehicle = db.get(Vehicle, payload.vehicle_id)
        if not vehicle:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "vehicle_id not found")
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Provide vehicle_id or set auto=true")

    driver_id = payload.driver_id or vehicle.driver_id
    driver = db.get(Driver, driver_id) if driver_id else None
    if not driver_id or not driver:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No valid driver for assignment")
    if driver.status != DriverStatus.ACTIVE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Driver is not yet approved")

    now = datetime.now(timezone.utc)
    trip = Trip(
        trip_code=next_trip_code(db),
        request_id=req.id,
        driver_id=driver_id,
        vehicle_id=vehicle.id,
        status=TripStatus.ASSIGNED,
        assigned_at=now,
    )
    vehicle.status = VehicleStatus.ON_TRIP
    req.status = RequestStatus.ASSIGNED
    db.add(trip)
    db.flush()
    audit.record(db, action="request_assigned", entity_type="trip", entity_id=trip.id,
                 actor_user_id=user.id, actor_role=user.role.value,
                 detail=f"request={req.id} vehicle={vehicle.id} driver={driver_id}")
    notify_hotel(db, req.hotel_id, event="request_assigned")
    notify_driver(db, driver_id, event="job_offer")
    db.commit()
    db.refresh(trip)
    return trip
