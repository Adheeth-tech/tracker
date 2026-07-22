"""Test that creating a driver via API automatically provisions a login-capable User account."""
from __future__ import annotations

import os
import tempfile

_DB = os.path.join(tempfile.gettempdir(), "squas_driver_test.db")
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

def test_driver_login_creation():
    seed.run()

    # Get admin token for fleet CRUD
    r = client.post("/api/v1/auth/otp/request", json={"phone": "+919000000001"})
    assert r.status_code == 200, r.text
    admin_otp = r.json()["dev_otp"]
    r = client.post("/api/v1/auth/otp/verify", json={"phone": "+919000000001", "code": admin_otp})
    assert r.status_code == 200, r.text
    admin_token = r.json()["access_token"]

    driver_phone = "+919999998888"
    
    # 1. Admin creates a driver via POST /fleet/drivers
    r = client.post(
        "/api/v1/fleet/drivers", 
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Kuttan Driver",
            "phone": driver_phone,
            "license_number": "KL-08-2026-9999"
        }
    )
    assert r.status_code == 201, r.text
    driver_id = r.json()["id"]

    # 2. Driver requests OTP
    r = client.post("/api/v1/auth/otp/request", json={"phone": driver_phone})
    assert r.status_code == 200, r.text
    driver_otp = r.json()["dev_otp"]
    assert driver_otp is not None

    # 3. Driver verifies OTP
    r = client.post("/api/v1/auth/otp/verify", json={"phone": driver_phone, "code": driver_otp})
    assert r.status_code == 200, r.text
    res = r.json()
    assert "access_token" in res
    assert res["role"] == "driver"
    assert res["user_id"] is not None

    # 4. Check /auth/me with driver token
    drv_token = res["access_token"]
    r = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {drv_token}"})
    assert r.status_code == 200, r.text
    me = r.json()
    assert me["driver_id"] == driver_id

    print("\nDriver auto-creation login test passed successfully!")

if __name__ == "__main__":
    test_driver_login_creation()
