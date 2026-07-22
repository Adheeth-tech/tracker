"""Hotel registration & management (spec 4.1)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.core.enums import HotelStatus, Role
from app.models.hotel import Hotel
from app.models.user import User
from app.schemas.entities import HotelCreate, HotelOut
from app.services import audit

router = APIRouter(prefix="/hotels", tags=["hotels"])


@router.post("", response_model=HotelOut, status_code=status.HTTP_201_CREATED)
def register_hotel(payload: HotelCreate, db: Session = Depends(get_db)):
    """Open registration; hotel starts as PENDING until admin approval."""
    hotel = Hotel(**payload.model_dump(), status=HotelStatus.PENDING)
    db.add(hotel)
    db.flush()
    
    if payload.phone:
        existing_user = db.scalars(select(User).where(User.phone == payload.phone)).first()
        if not existing_user:
            db.add(User(
                phone=payload.phone,
                name=payload.contact_person or payload.hotel_name,
                role=Role.HOTEL,
                hotel_id=hotel.id
            ))
            
    audit.record(db, action="hotel_registered", entity_type="hotel", entity_id=hotel.id)
    db.commit()
    db.refresh(hotel)
    return hotel


@router.get("", response_model=list[HotelOut])
def list_hotels(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN)),
):
    return list(db.scalars(select(Hotel).order_by(Hotel.id)))


@router.get("/{hotel_id}", response_model=HotelOut)
def get_hotel(
    hotel_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    hotel = db.get(Hotel, hotel_id)
    if not hotel:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hotel not found")
    # Hotel users may only read their own record.
    if user.role == Role.HOTEL and user.hotel_id != hotel_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your hotel")
    return hotel


@router.post("/{hotel_id}/approve", response_model=HotelOut)
def approve_hotel(
    hotel_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(Role.ADMIN)),
):
    hotel = db.get(Hotel, hotel_id)
    if not hotel:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hotel not found")
    hotel.status = HotelStatus.ACTIVE
    audit.record(db, action="hotel_approved", entity_type="hotel", entity_id=hotel.id,
                 actor_user_id=user.id, actor_role=user.role.value)
    db.commit()
    db.refresh(hotel)
    return hotel
