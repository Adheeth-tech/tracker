from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel

from app.core.enums import DriverStatus, HotelStatus, PaymentMode, VehicleStatus


# ---------- Hotel ----------
class HotelCreate(BaseModel):
    hotel_name: str
    contact_person: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    gst_number: str | None = None
    tank_location: str | None = None
    tank_capacity: float | None = None
    usual_volume: float | None = None
    usual_pickup_time: str | None = None
    payment_type: PaymentMode = PaymentMode.CASH


class HotelOut(HotelCreate):
    id: int
    status: HotelStatus
    model_config = {"from_attributes": True}


# ---------- Driver ----------
class DriverCreate(BaseModel):
    name: str
    phone: str
    license_number: str | None = None


class DriverUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    license_number: str | None = None


class DriverOut(DriverCreate):
    id: int
    is_active: bool
    status: DriverStatus
    model_config = {"from_attributes": True}


# ---------- Vehicle ----------
class VehicleCreate(BaseModel):
    vehicle_number: str
    capacity_litres: float
    gps_device_id: str | None = None
    driver_id: int | None = None
    insurance_expiry: date | None = None
    fitness_expiry: date | None = None
    last_service_date: date | None = None


class VehicleUpdate(BaseModel):
    vehicle_number: str | None = None
    capacity_litres: float | None = None
    gps_device_id: str | None = None
    driver_id: int | None = None
    insurance_expiry: date | None = None
    fitness_expiry: date | None = None
    last_service_date: date | None = None


class VehicleOut(VehicleCreate):
    id: int
    status: VehicleStatus
    last_lat: float | None = None
    last_lng: float | None = None
    last_location_at: datetime | None = None
    model_config = {"from_attributes": True}
