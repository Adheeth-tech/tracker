"""Road navigation routes for the driver and operations dashboards."""
from __future__ import annotations

import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.api.deps import ensure_active_driver, get_current_user, require_roles
from app.core.config import settings
from app.core.database import get_db
from app.core.enums import Role, TripStatus
from app.models.pickup_request import PickupRequest
from app.models.trip import Trip
from app.models.user import User
from app.schemas.ops import (
    NavigationDestination,
    NavigationRouteOut,
    NavigationStep,
)

router = APIRouter(prefix="/navigation", tags=["navigation"])

_PLANT_STATUSES = {
    TripStatus.MOVING_TO_PLANT,
    TripStatus.REACHED_PLANT,
    TripStatus.UNLOADED,
}


def _get_trip(db: Session, trip_id: int, user: User) -> Trip:
    trip = (
        db.query(Trip)
        .options(joinedload(Trip.request).joinedload(PickupRequest.hotel))
        .filter(Trip.id == trip_id)
        .first()
    )
    if not trip:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trip not found")
    if user.role == Role.DRIVER and trip.driver_id != user.driver_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your trip")
    if user.role == Role.HOTEL and (
        not trip.request or trip.request.hotel_id != user.hotel_id
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your hotel's trip")
    ensure_active_driver(user)
    return trip


def _destination(trip: Trip) -> NavigationDestination:
    if trip.status in _PLANT_STATUSES:
        if settings.plant_latitude is None or settings.plant_longitude is None:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "Treatment plant coordinates are not configured",
            )
        return NavigationDestination(
            type="plant",
            name=settings.plant_name,
            address=settings.plant_address,
            latitude=settings.plant_latitude,
            longitude=settings.plant_longitude,
        )

    hotel = trip.request.hotel if trip.request else None
    if not hotel or hotel.latitude is None or hotel.longitude is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Pickup hotel coordinates are not configured",
        )
    return NavigationDestination(
        type="hotel",
        name=hotel.hotel_name,
        address=hotel.address or "",
        latitude=hotel.latitude,
        longitude=hotel.longitude,
    )


@router.get("/trips/{trip_id}/route", response_model=NavigationRouteOut)
def route_to_trip_destination(
    trip_id: int,
    origin_lat: float,
    origin_lng: float,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.DRIVER, Role.ADMIN, Role.HOTEL)),
):
    """Calculate a road route from the supplied GPS origin to the active destination."""
    trip = _get_trip(db, trip_id, user)
    destination = _destination(trip)

    if not settings.mapbox_access_token:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Mapbox navigation is not configured",
        )

    coordinates = (
        f"{origin_lng},{origin_lat};"
        f"{destination.longitude},{destination.latitude}"
    )
    params = urlencode({
        "overview": "full",
        "geometries": "geojson",
        "steps": "true",
        "alternatives": "false",
        "access_token": settings.mapbox_access_token,
    })
    request = Request(
        f"https://api.mapbox.com/directions/v5/{settings.mapbox_profile}/{coordinates}?{params}",
        headers={"User-Agent": "SquasClusterConnect/1.0"},
    )

    try:
        with urlopen(request, timeout=10) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError) as exc:
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "Mapbox route service is unavailable",
        ) from exc

    if payload.get("code") != "Ok" or not payload.get("routes"):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            payload.get("message", "No road route was found"),
        )

    route = payload["routes"][0]
    steps: list[NavigationStep] = []
    for leg in route.get("legs", []):
        for step in leg.get("steps", []):
            maneuver = step.get("maneuver", {})
            banner = step.get("bannerInstructions") or step.get("banner_instructions") or []
            instruction = None
            if banner:
                instruction = banner[0].get("primary", {}).get("text")
            steps.append(NavigationStep(
                instruction=instruction,
                distance_meters=step.get("distance"),
                duration_seconds=step.get("duration"),
                maneuver=maneuver.get("type"),
                location=maneuver.get("location"),
            ))

    return NavigationRouteOut(
        destination=destination,
        distance_meters=route.get("distance", 0),
        duration_seconds=route.get("duration", 0),
        geometry=route.get("geometry", {}),
        steps=steps,
    )
