"""Auth endpoints — OTP request/verify + role-based JWT (spec section 8)."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.config import settings
from app.core.security import create_access_token, generate_otp, otp_expiry
from app.models.user import OtpCode, User
from app.schemas.auth import (
    OtpRequest,
    OtpRequestResponse,
    OtpVerify,
    Token,
    UserOut,
)
from app.services import audit
from app.services.notifications import notify

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/otp/request", response_model=OtpRequestResponse)
def request_otp(payload: OtpRequest, db: Session = Depends(get_db)):
    code = generate_otp()
    db.add(OtpCode(phone=payload.phone, code=code, expires_at=otp_expiry()))
    db.commit()
    # In production, dispatch via SMS/WhatsApp instead of echoing.
    return OtpRequestResponse(
        detail="OTP sent",
        dev_otp=settings.dev_otp if settings.otp_dev_echo and settings.dev_otp else (code if settings.otp_dev_echo else None),
    )


@router.post("/otp/verify", response_model=Token)
def verify_otp(payload: OtpVerify, db: Session = Depends(get_db)):
    is_dev_otp = (
        settings.env == "development"
        and settings.dev_otp is not None
        and payload.code == settings.dev_otp
    )

    if not is_dev_otp:
        stmt = (
            select(OtpCode)
            .where(OtpCode.phone == payload.phone, OtpCode.consumed.is_(False))
            .order_by(OtpCode.id.desc())
        )
        otp = db.scalars(stmt).first()
        now = datetime.now(timezone.utc)
        expires = otp.expires_at if otp else None
        if expires is not None and expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if not otp or otp.code != payload.code or expires < now:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired OTP")

        otp.consumed = True

    user = db.scalars(select(User).where(User.phone == payload.phone)).first()
    if not user:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            "No account for this phone. Ask an admin to register you.",
        )

    audit.record(db, action="login", entity_type="user", entity_id=user.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    db.commit()

    token = create_access_token(subject=str(user.id), role=user.role.value)
    return Token(access_token=token, role=user.role, user_id=user.id)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user
