from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel
from app.schemas.entities import VehicleOut, HotelOut

from app.core.enums import (
    PaymentMode,
    PaymentStatus,
    QuantitySource,
    RequestStatus,
    TripStatus,
    Urgency,
    WastewaterType,
)


# ---------- Pickup request ----------
class PickupRequestCreate(BaseModel):
    hotel_id: int | None = None  # inferred from token for hotel users
    requested_date: date | None = None
    time_window: str | None = None
    estimated_litres: float | None = None
    wastewater_type: WastewaterType = WastewaterType.MIXED
    access_instructions: str | None = None
    remarks: str | None = None
    urgency: Urgency = Urgency.NORMAL


class PickupRequestOut(BaseModel):
    id: int
    request_code: str
    hotel_id: int
    requested_date: date | None
    time_window: str | None
    estimated_litres: float | None
    wastewater_type: WastewaterType
    urgency: Urgency
    status: RequestStatus
    model_config = {"from_attributes": True}


class PickupRequestDetailOut(BaseModel):
    id: int
    request_code: str
    hotel_id: int
    requested_date: date | None
    time_window: str | None
    estimated_litres: float | None
    wastewater_type: WastewaterType
    access_instructions: str | None
    remarks: str | None
    urgency: Urgency
    status: RequestStatus
    hotel: HotelOut | None = None
    model_config = {"from_attributes": True}


# ---------- Assignment ----------
class AssignmentRequest(BaseModel):
    driver_id: int | None = None    # if omitted with auto=True, engine picks
    vehicle_id: int | None = None
    auto: bool = False


# ---------- Trip ----------
class TripOut(BaseModel):
    id: int
    trip_code: str
    request_id: int
    driver_id: int
    vehicle_id: int
    status: TripStatus
    assigned_at: datetime | None
    accepted_at: datetime | None
    started_at: datetime | None
    arrived_at: datetime | None
    collected_at: datetime | None
    loading_started_at: datetime | None = None
    delivery_started_at: datetime | None = None
    plant_received_at: datetime | None
    completed_at: datetime | None
    request: PickupRequestDetailOut | None = None
    vehicle: VehicleOut | None = None
    payment: PaymentOut | None = None
    quantity: QuantityOut | None = None
    model_config = {"from_attributes": True}


class GeoPointIn(BaseModel):
    latitude: float
    longitude: float
    speed: float | None = None


class TripAdvance(BaseModel):
    target: TripStatus
    location: GeoPointIn | None = None


# ---------- Tracking ----------
class LocationPing(BaseModel):
    latitude: float
    longitude: float
    speed: float | None = None
    status: str | None = None


class VehiclePosition(BaseModel):
    vehicle_id: int
    vehicle_number: str
    latitude: float | None
    longitude: float | None
    status: str
    trip_id: int | None = None
    model_config = {"from_attributes": True}


# ---------- Quantity ----------
class QuantityIn(BaseModel):
    driver_entered_litres: float | None = None
    hotel_confirmed_litres: float | None = None
    collected_litres: float | None = None
    source: QuantitySource = QuantitySource.MANUAL
    proof_photo_url: str | None = None
    variance_remarks: str | None = None


class QuantityOut(BaseModel):
    id: int
    trip_id: int
    estimated_litres: float | None
    driver_entered_litres: float | None
    hotel_confirmed_litres: float | None
    plant_received_litres: float | None
    collected_litres: float | None
    variance_litres: float | None
    source: QuantitySource
    proof_photo_url: str | None
    model_config = {"from_attributes": True}


# ---------- Payment ----------
class PaymentIn(BaseModel):
    payment_mode: PaymentMode
    payment_status: PaymentStatus = PaymentStatus.UNPAID
    transaction_id: str | None = None
    rate_per_litre: float | None = None


class PaymentOut(BaseModel):
    id: int
    trip_id: int
    rate_per_litre: float | None
    quantity_litres: float | None
    amount: float | None
    payment_mode: PaymentMode
    payment_status: PaymentStatus
    transaction_id: str | None
    paid_at: datetime | None
    model_config = {"from_attributes": True}


class InvoiceGenerate(BaseModel):
    hotel_id: int
    period_start: date
    period_end: date


class InvoiceOut(BaseModel):
    id: int
    invoice_code: str
    hotel_id: int
    period_start: date | None
    period_end: date | None
    total_litres: float
    total_amount: float
    trip_count: int
    status: str
    model_config = {"from_attributes": True}


# ---------- Treatment ----------
class PlantReceiptIn(BaseModel):
    received_litres: float
    batch_code: str | None = None   # create/find batch by code; optional
    remarks: str | None = None


class PlantReceiptOut(BaseModel):
    id: int
    trip_id: int
    batch_id: int | None
    received_litres: float
    unloaded_at: datetime | None
    model_config = {"from_attributes": True}
