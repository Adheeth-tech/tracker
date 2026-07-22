import os
from datetime import date
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, init_db
from app.models.hotel import Hotel
from app.models.pickup_request import PickupRequest
from app.core.enums import HotelStatus, RequestStatus, WastewaterType, Urgency
from app.services.codes import next_request_code

def main():
    db = SessionLocal()
    try:
        # Create a pending hotel
        pending_hotel = Hotel(
            hotel_name="Orchard Luxury Inn",
            contact_person="Sam Thomas",
            phone="+919000000099",
            email="sam@orchard.example",
            address="Round North, Thrissur",
            latitude=10.5280, longitude=76.2160,
            tank_capacity=4000,
            status=HotelStatus.PENDING
        )
        db.add(pending_hotel)
        
        # Get active hotel to attach a request
        active_hotel = db.query(Hotel).filter_by(status=HotelStatus.ACTIVE).first()
        if active_hotel:
            pending_req = PickupRequest(
                request_code=next_request_code(db),
                hotel_id=active_hotel.id,
                requested_date=date.today(),
                time_window="10:00-12:00",
                estimated_litres=1500,
                wastewater_type=WastewaterType.MIXED,
                urgency=Urgency.NORMAL,
                status=RequestStatus.REQUESTED
            )
            db.add(pending_req)
            print(f"Created pending request: {pending_req.request_code} for {active_hotel.hotel_name}")
            
        db.commit()
        print("Created pending hotel: Orchard Luxury Inn")
    except Exception as e:
        print("Error:", e)
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
