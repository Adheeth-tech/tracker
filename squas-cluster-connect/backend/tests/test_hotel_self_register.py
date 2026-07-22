"""Test self-registration and subsequent OTP login for a new hotel (hotel dashboard flow)."""
from __future__ import annotations

import os
import tempfile

# Use an isolated throwaway SQLite DB.
_DB = os.path.join(tempfile.gettempdir(), "squas_self_register_test.db")
if os.path.exists(_DB):
    try:
        os.remove(_DB)
    except Exception:
        pass
os.environ["DATABASE_URL"] = f"sqlite:///{_DB}"
os.environ["OTP_DEV_ECHO"] = "true"

from fastapi.testclient import TestClient
from app.main import app
from app import seed

client = TestClient(app)

def test_hotel_self_register():
    seed.run()

    # 1. Register a new hotel with a fresh phone number
    hotel_phone = "+919999999999"
    r = client.post("/api/v1/hotels", json={
        "hotel_name": "GoldMan Inn",
        "contact_person": "Gold Man",
        "phone": hotel_phone,
        "email": "goldman@example.com",
        "address": "MG Road, Thrissur",
        "latitude": 10.53,
        "longitude": 76.22,
        "gst_number": "32AAAAA1111A1Z1",
        "tank_location": "Rear",
        "tank_capacity": 4000,
        "usual_volume": 1200,
        "usual_pickup_time": "08:00-10:00",
        "payment_type": "monthly_invoice"
    })
    assert r.status_code == 201, r.text
    hotel_id = r.json()["id"]
    assert r.json()["status"] == "pending"

    # 2. Immediately request OTP for login with that same phone
    r = client.post("/api/v1/auth/otp/request", json={"phone": hotel_phone})
    assert r.status_code == 200, r.text
    dev_otp = r.json()["dev_otp"]
    assert dev_otp is not None

    # 3. Verify OTP to authenticate
    r = client.post("/api/v1/auth/otp/verify", json={"phone": hotel_phone, "code": dev_otp})
    assert r.status_code == 200, r.text
    res = r.json()
    assert "access_token" in res
    assert res["role"] == "hotel"
    assert res["user_id"] is not None

    # 4. Check profile with the token
    token = res["access_token"]
    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    me_res = r.json()
    assert me_res["hotel_id"] == hotel_id

    print("\nSelf-register test passed successfully!")

if __name__ == "__main__":
    test_hotel_self_register()
