"""Test driver assignment acceptance gate (accept & decline endpoints)."""
from __future__ import annotations

import os
import tempfile

_DB = os.path.join(tempfile.gettempdir(), "squas_driver_acceptance_test.db")
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

def test_driver_acceptance_flow():
    seed.run()

    # Log in as admin
    r = client.post("/api/v1/auth/otp/request", json={"phone": "+919000000001"})
    admin_otp = r.json()["dev_otp"]
    r = client.post("/api/v1/auth/otp/verify", json={"phone": "+919000000001", "code": admin_otp})
    admin_token = r.json()["access_token"]

    # Log in as driver (+919000000020, already seeded and ACTIVE)
    r = client.post("/api/v1/auth/otp/request", json={"phone": "+919000000020"})
    driver_otp = r.json()["dev_otp"]
    r = client.post("/api/v1/auth/otp/verify", json={"phone": "+919000000020", "code": driver_otp})
    driver_token = r.json()["access_token"]

    # 1. Create a request (hotel 1)
    # Log in as hotel to submit request
    r = client.post("/api/v1/auth/otp/request", json={"phone": "+919000000010"})
    hotel_otp = r.json()["dev_otp"]
    r = client.post("/api/v1/auth/otp/verify", json={"phone": "+919000000010", "code": hotel_otp})
    hotel_token = r.json()["access_token"]

    r = client.post(
        "/api/v1/requests",
        headers={"Authorization": f"Bearer {hotel_token}"},
        json={
            "wastewater_type": "greywater",
            "estimated_litres": 1500,
            "remarks": "urgent pool cleanup"
        }
    )
    assert r.status_code == 201, r.text
    req_id = r.json()["id"]

    # Approve request
    r = client.post(
        f"/api/v1/requests/{req_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert r.status_code == 200

    # 2. Assign driver 1 and vehicle 1 (vehicle_id=1, driver_id=1)
    r = client.post(
        f"/api/v1/requests/{req_id}/assign",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"vehicle_id": 1, "driver_id": 1}
    )
    assert r.status_code == 200, r.text
    trip_id = r.json()["id"]
    assert r.json()["accepted_at"] is None

    # 3. Try to advance straight to driver_started (should fail with 409)
    r = client.post(
        f"/api/v1/trips/{trip_id}/advance",
        headers={"Authorization": f"Bearer {driver_token}"},
        json={"target": "driver_started"}
    )
    assert r.status_code == 409, r.text
    assert "Driver must accept the assignment" in r.json()["detail"]

    # 4. Accept the trip
    r = client.post(
        f"/api/v1/trips/{trip_id}/accept",
        headers={"Authorization": f"Bearer {driver_token}"}
    )
    assert r.status_code == 200, r.text
    assert r.json()["accepted_at"] is not None

    # 5. Try to advance to driver_started now (should succeed)
    r = client.post(
        f"/api/v1/trips/{trip_id}/advance",
        headers={"Authorization": f"Bearer {driver_token}"},
        json={"target": "driver_started"}
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "driver_started"

    # 6. Test the decline flow
    # Register another request
    r = client.post(
        "/api/v1/requests",
        headers={"Authorization": f"Bearer {hotel_token}"},
        json={"wastewater_type": "greywater", "estimated_litres": 2000}
    )
    req_id2 = r.json()["id"]

    # Approve request
    client.post(f"/api/v1/requests/{req_id2}/approve", headers={"Authorization": f"Bearer {admin_token}"})

    # Since vehicle 1 was ON_TRIP, let's set it back to AVAILABLE to test second assignment
    # Or just use vehicle 1 directly by updating vehicle status
    # Or register a vehicle 2. Let's register a vehicle 2:
    r = client.post(
        "/api/v1/fleet/vehicles",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"vehicle_number": "KL-08-AA-9999", "capacity_litres": 5000, "driver_id": 1}
    )
    veh_id2 = r.json()["id"]

    # Assign vehicle 2
    r = client.post(
        f"/api/v1/requests/{req_id2}/assign",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"vehicle_id": veh_id2, "driver_id": 1}
    )
    assert r.status_code == 200, r.text
    trip_id2 = r.json()["id"]

    # Decline the trip
    r = client.post(
        f"/api/v1/trips/{trip_id2}/decline",
        headers={"Authorization": f"Bearer {driver_token}"}
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "cancelled"

    # Assert vehicle 2 is back to AVAILABLE
    r = client.get(
        "/api/v1/fleet/vehicles",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    vehicles = r.json()
    veh2 = next(v for v in vehicles if v["id"] == veh_id2)
    assert veh2["status"] == "available"

    print("\nDriver acceptance integration tests completed successfully!")

if __name__ == "__main__":
    test_driver_acceptance_flow()
