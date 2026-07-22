"""FastAPI dependencies for authentication and role-based access control.

RBAC is mandatory per spec section 10. `require_roles(...)` returns a dependency
that both authenticates the bearer token and authorises the caller's role.
"""
from __future__ import annotations

from collections.abc import Iterable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.enums import Role
from app.core.security import decode_access_token
from app.models.user import User

# tokenUrl points at the OTP-verify endpoint that returns the bearer token.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/otp/verify", auto_error=False)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    claims = decode_access_token(token)
    if not claims:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = db.get(User, int(claims["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return user


def require_roles(*roles: Role):
    """Build a dependency that allows only the listed roles."""
    allowed = set(roles)

    def _dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Requires role in {[r.value for r in allowed]}",
            )
        return user

    return _dep


# Convenience shorthands used across routers.
def admin_only():
    return require_roles(Role.ADMIN)


def any_role(roles: Iterable[Role]):
    return require_roles(*roles)
