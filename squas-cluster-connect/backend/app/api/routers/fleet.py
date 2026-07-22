"""Driver & vehicle management (spec 4.3). Admin-managed."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.core.enums import DriverStatus, Role
from app.models.fleet import Driver, Vehicle
from app.models.user import User
from app.schemas.entities import (
    DriverCreate,
    DriverOut,
    VehicleCreate,
    VehicleOut,
)
from app.services import audit

router = APIRouter(prefix="/fleet", tags=["fleet"])
_admin = require_roles(Role.ADMIN)


# ---- Drivers ----
@router.post("/drivers", response_model=DriverOut, status_code=201)
def create_driver(payload: DriverCreate, db: Session = Depends(get_db), user: User = Depends(_admin)):
    driver = Driver(**payload.model_dump(), status=DriverStatus.ACTIVE, is_active=True)
    db.add(driver)
    db.flush()
    
    if payload.phone:
        existing_user = db.scalars(select(User).where(User.phone == payload.phone)).first()
        if not existing_user:
            db.add(User(
                phone=payload.phone,
                name=payload.name,
                role=Role.DRIVER,
                driver_id=driver.id
            ))
            
    audit.record(db, action="driver_created", entity_type="driver", entity_id=driver.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    db.commit()
    db.refresh(driver)
    return driver


@router.post("/drivers/register", response_model=DriverOut, status_code=201)
def self_register_driver(payload: DriverCreate, db: Session = Depends(get_db)):
    driver = Driver(**payload.model_dump(), status=DriverStatus.PENDING, is_active=False)
    db.add(driver)
    db.flush()
    if payload.phone:
        existing_user = db.scalars(select(User).where(User.phone == payload.phone)).first()
        if not existing_user:
            db.add(User(
                phone=payload.phone,
                name=payload.name,
                role=Role.DRIVER,
                driver_id=driver.id
            ))
    audit.record(db, action="driver_registered", entity_type="driver", entity_id=driver.id)
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
    if payload.driver_id and not db.get(Driver, payload.driver_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "driver_id does not exist")
    vehicle = Vehicle(**payload.model_dump())
    db.add(vehicle)
    db.flush()
    audit.record(db, action="vehicle_created", entity_type="vehicle", entity_id=vehicle.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.get("/vehicles", response_model=list[VehicleOut])
def list_vehicles(db: Session = Depends(get_db), user: User = Depends(_admin)):
    return list(db.scalars(select(Vehicle).order_by(Vehicle.id)))
