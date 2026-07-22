"""Seed demo data so the platform is usable immediately after setup.

Run:  python -m app.seed
Creates one admin, one treatment operator, one hotel (+hotel user),
one driver (+driver user) and one vehicle.
"""
from __future__ import annotations

from app.core.database import SessionLocal, init_db
from app.core.enums import DriverStatus, HotelStatus, PaymentMode, Role, VehicleStatus
from app.models.fleet import Driver, Vehicle
from app.models.hotel import Hotel
from app.models.user import User


def run() -> None:
    init_db()
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("Seed skipped: users already exist.")
            return

        hotel = Hotel(
            hotel_name="Grand Riverside Hotel",
            contact_person="Anita Menon",
            phone="+919000000010",
            email="ops@riverside.example",
            address="MG Road, Thrissur, Kerala",
            latitude=10.5276, longitude=76.2144,
            tank_location="Rear service yard",
            tank_capacity=5000, usual_volume=1200,
            usual_pickup_time="08:00-10:00",
            payment_type=PaymentMode.MONTHLY_INVOICE,
            status=HotelStatus.ACTIVE,
        )
        db.add(hotel)
        db.flush()

        driver = Driver(name="Rajesh Kumar", phone="+919000000020", license_number="KL-08-2024-1234", status=DriverStatus.ACTIVE)
        db.add(driver)
        db.flush()

        vehicle = Vehicle(
            vehicle_number="KL-08-AB-1234", capacity_litres=6000,
            gps_device_id="GPS-0001", driver_id=driver.id,
            status=VehicleStatus.AVAILABLE, last_lat=10.5300, last_lng=76.2100,
        )
        db.add(vehicle)

        db.add_all([
            User(phone="+919000000001", name="Squas Admin", role=Role.ADMIN),
            User(phone="+919000000002", name="Plant Operator", role=Role.TREATMENT),
            User(phone="+919000000010", name="Anita Menon", role=Role.HOTEL, hotel_id=hotel.id),
            User(phone="+919000000020", name="Rajesh Kumar", role=Role.DRIVER, driver_id=driver.id),
        ])
        db.commit()

        print("Seed complete. Login phones (OTP echoed in dev):")
        print("  admin     +919000000001")
        print("  treatment +919000000002")
        print("  hotel     +919000000010")
        print("  driver    +919000000020")
    finally:
        db.close()


if __name__ == "__main__":
    run()
