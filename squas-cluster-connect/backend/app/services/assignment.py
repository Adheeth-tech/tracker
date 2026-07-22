"""Vehicle & driver assignment (spec 4.3).

v1 is manual assignment. `auto_assign()` provides a pluggable heuristic hook so
the future auto-assignment (distance / availability / capacity / route
efficiency) can drop in without touching the API layer.
"""
from __future__ import annotations

import math

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import DriverStatus, VehicleStatus
from app.models.fleet import Driver, Vehicle
from app.models.pickup_request import PickupRequest


def _haversine_km(lat1, lng1, lat2, lng2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def available_vehicles(db: Session) -> list[Vehicle]:
    stmt = (
        select(Vehicle)
        .join(Driver, Vehicle.driver_id == Driver.id)
        .where(
            Vehicle.status == VehicleStatus.AVAILABLE,
            Vehicle.driver_id.is_not(None),
            Driver.status == DriverStatus.ACTIVE,
        )
    )
    return list(db.scalars(stmt))


def score_vehicle(vehicle: Vehicle, request: PickupRequest) -> float:
    """Lower is better. Distance-first, capacity as a tie-break penalty."""
    hotel = request.hotel
    distance = 0.0
    if (
        vehicle.last_lat is not None
        and vehicle.last_lng is not None
        and hotel is not None
        and hotel.latitude is not None
        and hotel.longitude is not None
    ):
        distance = _haversine_km(
            vehicle.last_lat, vehicle.last_lng, hotel.latitude, hotel.longitude
        )

    # Penalise vehicles far larger than needed (poor utilisation).
    needed = request.estimated_litres or 0.0
    capacity_penalty = 0.0
    if needed and vehicle.capacity_litres:
        if vehicle.capacity_litres < needed:
            capacity_penalty = 1000.0  # cannot fit — heavily deprioritise
        else:
            capacity_penalty = (vehicle.capacity_litres - needed) / 1000.0
    return distance + capacity_penalty


def auto_assign(db: Session, request: PickupRequest) -> Vehicle | None:
    """Return the best available vehicle for a request, or None."""
    candidates = available_vehicles(db)
    if not candidates:
        return None
    return min(candidates, key=lambda v: score_vehicle(v, request))
