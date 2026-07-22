"""Live tracking & map data (spec 4.4).

Drivers push periodic location pings; hotels track their assigned tanker; admin
sees every active vehicle on the live map.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.core.enums import Role, TripStatus
from app.models.fleet import Vehicle
from app.models.trip import LocationLog, Trip
from app.models.user import User
from app.schemas.ops import LocationPing, VehiclePosition

router = APIRouter(prefix="/tracking", tags=["tracking"])


@router.post("/trips/{trip_id}/ping", status_code=204)
def push_ping(
    trip_id: int,
    ping: LocationPing,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.DRIVER, Role.ADMIN)),
):
    """Ingest a GPS ping from the driver app during an active trip."""
    trip = db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    if user.role == Role.DRIVER and trip.driver_id != user.driver_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your trip")

    now = datetime.now(timezone.utc)
    db.add(LocationLog(
        trip_id=trip.id, vehicle_id=trip.vehicle_id,
        latitude=ping.latitude, longitude=ping.longitude,
        speed=ping.speed, status=ping.status or trip.status.value, timestamp=now,
    ))
    if trip.vehicle:
        trip.vehicle.last_lat = ping.latitude
        trip.vehicle.last_lng = ping.longitude
    db.commit()


@router.get("/trips/{trip_id}", response_model=list[dict])
def trip_track(
    trip_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = 50,
):
    """Recent breadcrumb trail for a trip (hotel sees its own; admin sees all)."""
    trip = db.get(Trip, trip_id)
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    if user.role == Role.HOTEL and trip.request.hotel_id != user.hotel_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your trip")

    logs = db.scalars(
        select(LocationLog)
        .where(LocationLog.trip_id == trip_id)
        .order_by(LocationLog.id.desc())
        .limit(limit)
    )
    return [
        {"lat": lg.latitude, "lng": lg.longitude, "speed": lg.speed,
         "status": lg.status, "ts": lg.timestamp.isoformat()}
        for lg in logs
    ]


@router.get("/live", response_model=list[VehiclePosition])
def live_map(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN)),
):
    """All vehicles' last-known positions for the admin control-room map."""
    vehicles = db.scalars(select(Vehicle))
    out: list[VehiclePosition] = []
    for v in vehicles:
        active = db.scalars(
            select(Trip).where(
                Trip.vehicle_id == v.id,
                Trip.status.not_in([TripStatus.CLOSED, TripStatus.CANCELLED]),
            )
        ).first()
        out.append(VehiclePosition(
            vehicle_id=v.id, vehicle_number=v.vehicle_number,
            latitude=v.last_lat, longitude=v.last_lng,
            status=v.status.value, trip_id=active.id if active else None,
        ))
    return out
