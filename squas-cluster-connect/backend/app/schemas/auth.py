from __future__ import annotations

from pydantic import BaseModel, Field

from app.core.enums import Role


class OtpRequest(BaseModel):
    phone: str = Field(..., examples=["+919000000001"])


class OtpRequestResponse(BaseModel):
    detail: str
    dev_otp: str | None = None  # populated only when OTP_DEV_ECHO is true


class OtpVerify(BaseModel):
    phone: str
    code: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Role
    user_id: int


class UserOut(BaseModel):
    id: int
    phone: str
    name: str | None
    email: str | None
    role: Role
    hotel_id: int | None
    driver_id: int | None

    model_config = {"from_attributes": True}
