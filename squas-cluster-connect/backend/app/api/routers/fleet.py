"""Driver & vehicle management (spec 4.3). Admin-managed."""
from __future__ import annotations

import re

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.core.enums import DriverStatus, Role, TripStatus, VehicleStatus
from app.models.fleet import Driver, Vehicle
from app.models.trip import LocationLog, Trip
from app.models.user import User
from app.schemas.entities import (
    DriverCreate,
    DriverOut,
    DriverUpdate,
    VehicleCreate,
    VehicleOut,
    VehicleUpdate,
)
from app.services import audit
from app.services.notifications import notify_role

router = APIRouter(prefix="/fleet", tags=["fleet"])
_admin = require_roles(Role.ADMIN)


def _normalize_vehicle_number(value: str) -> str:
    """Store fleet numbers consistently even when called outside the web UI."""
    compact = re.sub(r"[^A-Za-z0-9]", "", value).upper()
    return "-".join(filter(None, (
        compact[:2], compact[2:4], compact[4:6], compact[6:10],
    )))


# ---- Drivers ----
@router.post("/drivers", response_model=DriverOut, status_code=201)
def create_driver(payload: DriverCreate, db: Session = Depends(get_db), user: User = Depends(_admin)):
    if db.scalars(select(User).where(User.phone == payload.phone)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "A user account already exists for this phone number")
    driver = Driver(**payload.model_dump(), status=DriverStatus.ACTIVE, is_active=True)
    db.add(driver)
    db.flush()
    
    if payload.phone:
        db.add(User(phone=payload.phone, name=payload.name, role=Role.DRIVER, driver_id=driver.id))
            
    audit.record(db, action="driver_created", entity_type="driver", entity_id=driver.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    db.commit()
    db.refresh(driver)
    return driver


@router.post("/drivers/register", response_model=DriverOut, status_code=201)
def self_register_driver(payload: DriverCreate, db: Session = Depends(get_db)):
    if db.scalars(select(User).where(User.phone == payload.phone)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "A user account already exists for this phone number")
    driver = Driver(**payload.model_dump(), status=DriverStatus.PENDING, is_active=False)
    db.add(driver)
    db.flush()
    if payload.phone:
        db.add(User(phone=payload.phone, name=payload.name, role=Role.DRIVER, driver_id=driver.id))
    audit.record(db, action="driver_registered", entity_type="driver", entity_id=driver.id)
    notify_role(db, Role.ADMIN, event="driver_registered")
    db.commit()
    db.refresh(driver)
    return driver


@router.post("/drivers/{driver_id}/approve", response_model=DriverOut)
def approve_driver(driver_id: int, db: Session = Depends(get_db), user: User = Depends(_admin)):
    driver = db.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Driver not found")
    driver.status = DriverStatus.ACTIVE
    driver.is_active = True
    audit.record(db, action="driver_approved", entity_type="driver", entity_id=driver.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    db.commit()
    db.refresh(driver)
    return driver


@router.patch("/drivers/{driver_id}", response_model=DriverOut)
def update_driver(driver_id: int, payload: DriverUpdate, db: Session = Depends(get_db), user: User = Depends(_admin)):
    driver = db.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Driver not found")
    if payload.phone and payload.phone != driver.phone:
        existing = db.scalars(select(User).where(User.phone == payload.phone, User.id != driver.user.id if driver.user else True)).first()
        if existing:
            raise HTTPException(status.HTTP_409_CONFLICT, "A user account already exists for this phone number")
    changes = payload.model_dump(exclude_unset=True)
    for key, value in changes.items():
        setattr(driver, key, value)
    if driver.user:
        if payload.name is not None:
            driver.user.name = payload.name
        if payload.phone is not None:
            driver.user.phone = payload.phone
    audit.record(db, action="driver_updated", entity_type="driver", entity_id=driver.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    db.commit()
    db.refresh(driver)
    return driver


@router.post("/drivers/{driver_id}/deactivate", response_model=DriverOut)
def deactivate_driver(driver_id: int, db: Session = Depends(get_db), user: User = Depends(_admin)):
    driver = db.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Driver not found")
    active_trip = db.scalars(select(Trip).where(
        Trip.driver_id == driver_id,
        Trip.status.not_in([TripStatus.CLOSED, TripStatus.CANCELLED]),
    )).first()
    if active_trip:
        raise HTTPException(status.HTTP_409_CONFLICT, "Cannot deactivate a driver with an active trip")
    driver.status = DriverStatus.SUSPENDED
    driver.is_active = False
    if driver.user:
        driver.user.is_active = False
    audit.record(db, action="driver_deactivated", entity_type="driver", entity_id=driver.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    db.commit()
    db.refresh(driver)
    return driver


@router.post("/drivers/{driver_id}/activate", response_model=DriverOut)
def activate_driver(driver_id: int, db: Session = Depends(get_db), user: User = Depends(_admin)):
    driver = db.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Driver not found")
    driver.status = DriverStatus.ACTIVE
    driver.is_active = True
    if driver.user:
        driver.user.is_active = True
    audit.record(db, action="driver_activated", entity_type="driver", entity_id=driver.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    db.commit()
    db.refresh(driver)
    return driver


@router.delete("/drivers/{driver_id}", status_code=204)
def delete_driver(driver_id: int, db: Session = Depends(get_db), user: User = Depends(_admin)):
    driver = db.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Driver not found")
    if db.scalars(select(Trip).where(Trip.driver_id == driver_id)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Cannot delete a driver referenced by trip history; suspend instead")
    if driver.vehicle:
        raise HTTPException(status.HTTP_409_CONFLICT, "Unassign the driver's vehicle before deletion")
    if driver.user:
        db.delete(driver.user)
    db.delete(driver)
    audit.record(db, action="driver_deleted", entity_type="driver", entity_id=driver_id,
                 actor_user_id=user.id, actor_role=user.role.value)
    db.commit()


@router.get("/drivers/{driver_id}", response_model=DriverOut)
def get_driver(driver_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    driver = db.get(Driver, driver_id)
    if not driver:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Driver not found")
    if user.role == Role.DRIVER and user.driver_id != driver_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your record")
    return driver


@router.get("/drivers", response_model=list[DriverOut])
def list_drivers(db: Session = Depends(get_db), user: User = Depends(_admin)):
    return list(db.scalars(select(Driver).order_by(Driver.id)))


# ---- Vehicles ----
@router.post("/vehicles", response_model=VehicleOut, status_code=201)
def create_vehicle(payload: VehicleCreate, db: Session = Depends(get_db), user: User = Depends(_admin)):
    vehicle_number = _normalize_vehicle_number(payload.vehicle_number)
    if not vehicle_number:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "vehicle_number is required")
    if db.scalars(select(Vehicle).where(Vehicle.vehicle_number == vehicle_number)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "A vehicle with this number already exists")
    if payload.driver_id:
        driver = db.get(Driver, payload.driver_id)
        if not driver:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "driver_id does not exist")
        if driver.status != DriverStatus.ACTIVE or not driver.is_active:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot assign a vehicle to a pending driver")
    vehicle_data = payload.model_dump()
    vehicle_data["vehicle_number"] = vehicle_number
    vehicle = Vehicle(**vehicle_data)
    db.add(vehicle)
    db.flush()
    audit.record(db, action="vehicle_created", entity_type="vehicle", entity_id=vehicle.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.patch("/vehicles/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(vehicle_id: int, payload: VehicleUpdate, db: Session = Depends(get_db), user: User = Depends(_admin)):
    vehicle = db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vehicle not found")
    changes = payload.model_dump(exclude_unset=True)
    if "vehicle_number" in changes and changes["vehicle_number"] is not None:
        changes["vehicle_number"] = _normalize_vehicle_number(changes["vehicle_number"])
        duplicate = db.scalars(select(Vehicle).where(
            Vehicle.vehicle_number == changes["vehicle_number"],
            Vehicle.id != vehicle_id,
        )).first()
        if duplicate:
            raise HTTPException(status.HTTP_409_CONFLICT, "A vehicle with this number already exists")
    if "driver_id" in changes:
        driver = db.get(Driver, changes["driver_id"]) if changes["driver_id"] else None
        if changes["driver_id"] and (not driver or driver.status != DriverStatus.ACTIVE or not driver.is_active):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Vehicle must be assigned to an active approved driver")
        if vehicle.status == VehicleStatus.ON_TRIP and changes["driver_id"] != vehicle.driver_id:
            raise HTTPException(status.HTTP_409_CONFLICT, "Cannot change driver while vehicle is on a trip")
    for key, value in changes.items():
        setattr(vehicle, key, value)
    audit.record(db, action="vehicle_updated", entity_type="vehicle", entity_id=vehicle.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.post("/vehicles/{vehicle_id}/deactivate", response_model=VehicleOut)
def deactivate_vehicle(vehicle_id: int, db: Session = Depends(get_db), user: User = Depends(_admin)):
    vehicle = db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vehicle not found")
    active_trip = db.scalars(select(Trip).where(
        Trip.vehicle_id == vehicle_id,
        Trip.status.not_in([TripStatus.CLOSED, TripStatus.CANCELLED]),
    )).first()
    if active_trip:
        raise HTTPException(status.HTTP_409_CONFLICT, "Cannot deactivate a vehicle with an active trip")
    vehicle.status = VehicleStatus.INACTIVE
    audit.record(db, action="vehicle_deactivated", entity_type="vehicle", entity_id=vehicle.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.post("/vehicles/{vehicle_id}/activate", response_model=VehicleOut)
def activate_vehicle(vehicle_id: int, db: Session = Depends(get_db), user: User = Depends(_admin)):
    vehicle = db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vehicle not found")
    vehicle.status = VehicleStatus.AVAILABLE
    audit.record(db, action="vehicle_activated", entity_type="vehicle", entity_id=vehicle.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.delete("/vehicles/{vehicle_id}", status_code=204)
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db), user: User = Depends(_admin)):
    vehicle = db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vehicle not found")
    if db.scalars(select(Trip).where(Trip.vehicle_id == vehicle_id)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Cannot delete a vehicle referenced by trip history; deactivate instead")
    if db.scalars(select(LocationLog).where(LocationLog.vehicle_id == vehicle_id)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Cannot delete a vehicle with GPS history; deactivate instead")
    db.delete(vehicle)
    audit.record(db, action="vehicle_deleted", entity_type="vehicle", entity_id=vehicle_id,
                 actor_user_id=user.id, actor_role=user.role.value)
    db.commit()


@router.get("/vehicles", response_model=list[VehicleOut])
def list_vehicles(db: Session = Depends(get_db), user: User = Depends(_admin)):
    return list(db.scalars(select(Vehicle).order_by(Vehicle.id)))
