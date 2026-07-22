"""Trip workflow engine — the operational core of the platform (spec 4.4/4.5).

A `Trip` moves through the granular driver statuses defined in spec 4.5. Every
transition:
  * is validated against the allowed-transition graph,
  * stamps the relevant milestone timestamp on the trip,
  * records a GPS `LocationLog` breadcrumb (each update captures lat/lng/time),
  * advances the parent `PickupRequest.status` (the hotel-facing lifecycle),
  * emits the relevant notification event.

Keeping this in one place means the API layer never mutates trip state directly;
it always calls `advance()`, which guarantees the invariants above.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from app.core.enums import RequestStatus, TripStatus, VehicleStatus

# Allowed forward transitions. CANCELLED is reachable from any non-terminal state
# and is added programmatically below.
_ALLOWED: dict[TripStatus, set[TripStatus]] = {
    TripStatus.ASSIGNED: {TripStatus.DRIVER_STARTED},
    TripStatus.DRIVER_STARTED: {TripStatus.REACHED_HOTEL},
    TripStatus.REACHED_HOTEL: {TripStatus.COLLECTION_STARTED},
    TripStatus.COLLECTION_STARTED: {TripStatus.COLLECTION_COMPLETED},
    TripStatus.COLLECTION_COMPLETED: {TripStatus.MOVING_TO_PLANT},
    TripStatus.MOVING_TO_PLANT: {TripStatus.REACHED_PLANT},
    TripStatus.REACHED_PLANT: {TripStatus.UNLOADED},
    TripStatus.UNLOADED: {TripStatus.CLOSED},
    TripStatus.CLOSED: set(),
    TripStatus.CANCELLED: set(),
}

_TERMINAL = {TripStatus.CLOSED, TripStatus.CANCELLED}

# Which milestone timestamp each status stamps onto the Trip row.
_TIMESTAMP_FIELD: dict[TripStatus, str] = {
    TripStatus.DRIVER_STARTED: "started_at",
    TripStatus.REACHED_HOTEL: "arrived_at",
    TripStatus.COLLECTION_STARTED: "loading_started_at",
    TripStatus.COLLECTION_COMPLETED: "collected_at",
    TripStatus.MOVING_TO_PLANT: "delivery_started_at",
    TripStatus.REACHED_PLANT: "plant_received_at",
    TripStatus.CLOSED: "completed_at",
}

# How trip statuses roll up into the hotel-facing request lifecycle (spec 4.2).
_REQUEST_STATUS_MAP: dict[TripStatus, RequestStatus] = {
    TripStatus.ASSIGNED: RequestStatus.ASSIGNED,
    TripStatus.DRIVER_STARTED: RequestStatus.IN_PROGRESS,
    TripStatus.REACHED_HOTEL: RequestStatus.IN_PROGRESS,
    TripStatus.COLLECTION_STARTED: RequestStatus.IN_PROGRESS,
    TripStatus.COLLECTION_COMPLETED: RequestStatus.COLLECTED,
    TripStatus.MOVING_TO_PLANT: RequestStatus.COLLECTED,
    TripStatus.REACHED_PLANT: RequestStatus.RECEIVED_AT_PLANT,
    TripStatus.UNLOADED: RequestStatus.RECEIVED_AT_PLANT,
    TripStatus.CLOSED: RequestStatus.COMPLETED,
    TripStatus.CANCELLED: RequestStatus.CANCELLED,
}

# Notification event names (consumed by services/notifications.py, spec 9).
_EVENT_MAP: dict[TripStatus, str] = {
    TripStatus.DRIVER_STARTED: "driver_started",
    TripStatus.REACHED_HOTEL: "driver_arriving",
    TripStatus.COLLECTION_COMPLETED: "collection_completed",
    TripStatus.REACHED_PLANT: "plant_receipt_confirmed",
    TripStatus.CLOSED: "trip_completed",
}


class InvalidTransition(Exception):
    """Raised when a requested trip status change is not permitted."""


@dataclass
class GeoPoint:
    latitude: float
    longitude: float
    speed: float | None = None


def allowed_next(current: TripStatus) -> set[TripStatus]:
    nxt = set(_ALLOWED.get(current, set()))
    if current not in _TERMINAL:
        nxt.add(TripStatus.CANCELLED)
    return nxt


def can_transition(current: TripStatus, target: TripStatus) -> bool:
    return target in allowed_next(current)


def request_status_for(trip_status: TripStatus) -> RequestStatus | None:
    return _REQUEST_STATUS_MAP.get(trip_status)


def event_for(trip_status: TripStatus) -> str | None:
    return _EVENT_MAP.get(trip_status)


def apply_transition(trip, target: TripStatus, at: datetime | None = None) -> None:
    """Mutate `trip` in place for a validated transition.

    Only touches the trip and (implicitly) its request; persistence, location
    logging and notifications are orchestrated by the service layer so this
    function stays pure and unit-testable.
    """
    current = trip.status
    if not can_transition(current, target):
        raise InvalidTransition(
            f"Cannot move trip from {current.value} to {target.value}"
        )

    now = at or datetime.now(timezone.utc)
    trip.status = target

    field = _TIMESTAMP_FIELD.get(target)
    if field is not None:
        setattr(trip, field, now)

    # Roll the parent request lifecycle forward.
    req_status = request_status_for(target)
    if req_status is not None and trip.request is not None:
        trip.request.status = req_status

    # Free up the vehicle at the end of a trip.
    if target in _TERMINAL and trip.vehicle is not None:
        trip.vehicle.status = VehicleStatus.AVAILABLE
