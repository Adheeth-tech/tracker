"""Append-only audit logging (spec 10).

Every important action routes through `record()` so audit coverage is uniform.
"""
from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.system import AuditLog


def record(
    db: Session,
    *,
    action: str,
    entity_type: str | None = None,
    entity_id: str | int | None = None,
    actor_user_id: int | None = None,
    actor_role: str | None = None,
    detail: str | None = None,
) -> AuditLog:
    log = AuditLog(
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        actor_user_id=actor_user_id,
        actor_role=actor_role,
        detail=detail,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log)
    return log
