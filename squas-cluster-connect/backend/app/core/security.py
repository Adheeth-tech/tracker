"""Auth primitives: JWT issuing/decoding and OTP generation.

The spec mandates "OTP + role-based login". This module keeps the crypto and
OTP concerns in one place. OTPs are stored in the DB (see models/user.py:OtpCode)
so the flow works across processes; in production wire delivery to SMS/WhatsApp.
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.core.config import settings


def create_access_token(subject: str, role: str, extra: dict | None = None) -> str:
    """Issue a signed JWT for a user identified by `subject` with a `role` claim."""
    now = datetime.now(timezone.utc)
    payload: dict = {
        "sub": subject,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict | None:
    """Return the token claims, or None if invalid/expired."""
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
    except JWTError:
        return None


def generate_otp(length: int = 6) -> str:
    """Generate a numeric OTP of the requested length."""
    return "".join(str(random.randint(0, 9)) for _ in range(length))


def otp_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(seconds=settings.otp_ttl_seconds)
