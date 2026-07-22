"""Reporting, analytics dashboard and notification feed (spec 4.9, 8, 9)."""
from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.core.enums import Role
from app.models.system import Notification
from app.models.user import User
from app.services import reports

router = APIRouter(tags=["reports"])
_admin = require_roles(Role.ADMIN)


@router.get("/reports/daily")
def daily(day: date | None = None, db: Session = Depends(get_db), user: User = Depends(_admin)):
    return reports.daily_collection(db, day or date.today())


@router.get("/reports/hotel-wise")
def hotel_wise(db: Session = Depends(get_db), user: User = Depends(_admin)):
    return reports.hotel_wise(db)


@router.get("/reports/fleet-summary")
def fleet(db: Session = Depends(get_db), user: User = Depends(_admin)):
    return reports.fleet_summary(db)


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(_admin)):
    """Admin control-room summary combining the key analytics (spec 8)."""
    return {
        "today": reports.daily_collection(db, datetime.now(timezone.utc).date()),
        "fleet": reports.fleet_summary(db),
        "hotels": reports.hotel_wise(db),
    }


@router.get("/notifications")
def my_notifications(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    unread_only: bool = False,
):
    stmt = (
        select(Notification)
        .where(Notification.recipient_user_id == user.id)
        .order_by(Notification.id.desc())
    )
    if unread_only:
        stmt = stmt.where(Notification.read.is_(False))
    return [
        {"id": n.id, "event": n.event, "title": n.title, "body": n.body,
         "channel": n.channel.value, "read": n.read, "created_at": n.created_at.isoformat()}
        for n in db.scalars(stmt)
    ]
