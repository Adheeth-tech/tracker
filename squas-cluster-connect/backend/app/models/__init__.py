"""Aggregate imports so `Base.metadata` sees every table.

Import order matters only for readability here; SQLAlchemy resolves
relationships lazily by string name.
"""
from app.models.user import User, OtpCode
from app.models.hotel import Hotel
from app.models.fleet import Driver, Vehicle
from app.models.pickup_request import PickupRequest
from app.models.trip import Trip, QuantityRecord, LocationLog
from app.models.billing import Payment, Invoice
from app.models.treatment import TreatmentBatch, PlantReceipt
from app.models.system import AuditLog, Notification

__all__ = [
    "User",
    "OtpCode",
    "Hotel",
    "Driver",
    "Vehicle",
    "PickupRequest",
    "Trip",
    "QuantityRecord",
    "LocationLog",
    "Payment",
    "Invoice",
    "TreatmentBatch",
    "PlantReceipt",
    "AuditLog",
    "Notification",
]
