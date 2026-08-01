"""Notification dispatch (spec 9).

Persists a Notification row and delegates delivery to a channel driver. The
drivers here are stubs that log; wire them to FCM / SMS / WhatsApp / email in
production. Because delivery is abstracted, the rest of the codebase only calls
`notify()` and never talks to a gateway directly.
"""
from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.enums import NotificationChannel, Role
from app.models.system import Notification
from app.models.user import User

logger = logging.getLogger("squas.notifications")

# Human-readable copy per event (spec 9 event list).
_EVENT_COPY: dict[str, tuple[str, str]] = {
    "request_submitted": ("Pickup request submitted", "Your pickup request was received."),
    "request_approved": ("Request approved", "Your pickup request has been approved."),
    "request_assigned": ("Tanker assigned", "A tanker has been assigned to your pickup."),
    "driver_started": ("Driver on the way", "Your assigned tanker has started the trip."),
    "driver_arriving": ("Driver arrived at hotel", "The assigned tanker has reached the hotel hub."),
    "collection_completed": ("Collection completed", "Wastewater collection is complete."),
    "payment_pending": ("Payment pending", "A payment is pending for your recent pickup."),
    "invoice_generated": ("Invoice generated", "A new invoice is available."),
    "plant_receipt_confirmed": ("Tanker reached plant", "The tanker has arrived at the treatment plant for unloading."),
    "trip_completed": ("Trip completed", "Your pickup trip is complete."),
    "job_offer": ("New job assigned", "You have a new pickup assignment awaiting your acceptance."),
    "hotel_registered": ("New hotel registration", "A new hotel is waiting for admin approval."),
    "driver_accepted": ("Driver accepted the job", "The assigned driver has accepted this pickup."),
    "driver_declined": ("Driver declined the job", "The assigned driver declined — please reassign."),
}


def _deliver(channel: NotificationChannel, title: str, body: str) -> bool:
    """Stub delivery. Returns True to mark delivered in dev."""
    logger.info("[%s] %s — %s", channel.value, title, body)
    # TODO: integrate FCM (push), SMS gateway, WhatsApp Business API, SMTP (email).
    return True


def notify(
    db: Session,
    *,
    event: str,
    recipient_user_id: int | None = None,
    channel: NotificationChannel = NotificationChannel.PUSH,
    title: str | None = None,
    body: str | None = None,
) -> Notification:
    default_title, default_body = _EVENT_COPY.get(event, (event, ""))
    note = Notification(
        recipient_user_id=recipient_user_id,
        channel=channel,
        event=event,
        title=title or default_title,
        body=body or default_body,
    )
    note.delivered = _deliver(channel, note.title or event, note.body or "")
    db.add(note)
    return note


def notify_role(db: Session, role: Role, *, event: str, **kwargs) -> list[Notification]:
    """Notify every user with the given role (e.g. every admin)."""
    users = db.scalars(select(User).where(User.role == role))
    return [notify(db, event=event, recipient_user_id=u.id, **kwargs) for u in users]


def notify_hotel(db: Session, hotel_id: int, *, event: str, **kwargs) -> list[Notification]:
    """Notify the user account(s) belonging to a specific hotel."""
    users = db.scalars(select(User).where(User.role == Role.HOTEL, User.hotel_id == hotel_id))
    return [notify(db, event=event, recipient_user_id=u.id, **kwargs) for u in users]


def notify_driver(db: Session, driver_id: int, *, event: str, **kwargs) -> Notification | None:
    """Notify the user account belonging to a specific driver."""
    u = db.scalars(select(User).where(User.role == Role.DRIVER, User.driver_id == driver_id)).first()
    return notify(db, event=event, recipient_user_id=u.id, **kwargs) if u else None
