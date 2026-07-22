"""Enumerations shared across models, schemas and the workflow engine.

Kept in one module so the ORM, the API schemas and the state machine all agree
on the exact vocabulary the spec defines.
"""
from __future__ import annotations

from enum import Enum


class Role(str, Enum):
    """User roles from spec section 2."""
    HOTEL = "hotel"
    DRIVER = "driver"
    ADMIN = "admin"
    TREATMENT = "treatment"  # Treatment Centre Operator


class HotelStatus(str, Enum):
    PENDING = "pending"      # awaiting admin approval (spec 4.1)
    ACTIVE = "active"
    SUSPENDED = "suspended"


class DriverStatus(str, Enum):
    PENDING = "pending"      # awaiting admin approval
    ACTIVE = "active"
    SUSPENDED = "suspended"


class VehicleStatus(str, Enum):
    AVAILABLE = "available"
    ON_TRIP = "on_trip"
    MAINTENANCE = "maintenance"
    INACTIVE = "inactive"


class WastewaterType(str, Enum):
    GREYWATER = "greywater"
    KITCHEN = "kitchen"
    MIXED = "mixed"
    BLACKWATER = "blackwater"
    OTHER = "other"


class Urgency(str, Enum):
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class RequestStatus(str, Enum):
    """Hotel-facing pickup request lifecycle (spec 4.2)."""
    REQUESTED = "requested"
    APPROVED = "approved"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COLLECTED = "collected"
    RECEIVED_AT_PLANT = "received_at_plant"
    COMPLETED = "completed"
    INVOICED = "invoiced"
    PAID = "paid"
    CANCELLED = "cancelled"


class TripStatus(str, Enum):
    """Operational trip lifecycle / driver status updates (spec 4.5)."""
    ASSIGNED = "assigned"
    DRIVER_STARTED = "driver_started"
    REACHED_HOTEL = "reached_hotel"
    COLLECTION_STARTED = "collection_started"
    COLLECTION_COMPLETED = "collection_completed"
    MOVING_TO_PLANT = "moving_to_plant"
    REACHED_PLANT = "reached_plant"
    UNLOADED = "unloaded"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class PaymentMode(str, Enum):
    CASH = "cash"
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"
    CREDIT = "credit"          # credit billing
    MONTHLY_INVOICE = "monthly_invoice"


class PaymentStatus(str, Enum):
    UNPAID = "unpaid"
    PARTIAL = "partial"
    PAID = "paid"


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    PAID = "paid"
    CANCELLED = "cancelled"


class QuantitySource(str, Enum):
    """How an actual quantity reading was captured (spec 4.6)."""
    MANUAL = "manual"
    FLOWMETER = "flowmeter"
    TANK_LEVEL = "tank_level"
    PHOTO = "photo"
    PLANT_CONFIRMATION = "plant_confirmation"


class NotificationChannel(str, Enum):
    PUSH = "push"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    EMAIL = "email"
