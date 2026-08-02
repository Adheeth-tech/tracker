"""End-to-end test of the core spec workflow (spec section 3).

Hotel request -> admin approve -> assign -> driver trip lifecycle ->
quantity -> payment -> plant receipt -> reports.

Runnable directly (`python -m tests.test_workflow`) or via pytest.
"""
from __future__ import annotations

import os
import tempfile

# Use an isolated throwaway SQLite DB — must be set before importing the app.
_DB = os.path.join(tempfile.gettempdir(), "squas_test.db")
if os.path.exists(_DB):
    os.remove(_DB)
os.environ["DATABASE_URL"] = f"sqlite:///{_DB}"
os.environ["OTP_DEV_ECHO"] = "true"

from fastapi.testclient import TestClient  # noqa: E402

from app.core.enums import TripStatus  # noqa: E402
from app.main import app  # noqa: E402
from app import seed  # noqa: E402

client = TestClient(app)

# Full driver status chain from the state machine (spec 4.5).
TRIP_CHAIN = [
    TripStatus.DRIVER_STARTED,
    TripStatus.REACHED_HOTEL,
    TripStatus.COLLECTION_STARTED,
    TripStatus.COLLECTION_COMPLETED,
    TripStatus.MOVING_TO_PLANT,
    TripStatus.REACHED_PLANT,
    TripStatus.UNLOADED,
    TripStatus.CLOSED,
]


def login(phone: str) -> str:
    r = client.post("/api/v1/auth/otp/request", json={"phone": phone})
    assert r.status_code == 200, r.text
    code = r.json()["dev_otp"]
    r = client.post("/api/v1/auth/otp/verify", json={"phone": phone, "code": code})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def hdr(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_full_workflow():
    seed.run()

    admin = login("+919000000001")
    hotel = login("+919000000010")
    driver = login("+919000000020")
    plant = login("+919000000002")

    # 1. Hotel raises a pickup request.
    r = client.post("/api/v1/requests", headers=hdr(hotel), json={
        "requested_date": "2026-07-10", "time_window": "08:00-10:00",
        "estimated_litres": 1000, "wastewater_type": "kitchen",
        "remarks": "Rear gate access", "urgency": "normal",
    })
    assert r.status_code == 201, r.text
    req_id = r.json()["id"]
    assert r.json()["request_code"].startswith("REQ-")
    assert r.json()["status"] == "requested"

    # 2. Admin approves.
    r = client.post(f"/api/v1/requests/{req_id}/approve", headers=hdr(admin))
    assert r.status_code == 200 and r.json()["status"] == "approved", r.text

    # 3. Admin auto-assigns a tanker (opens a Trip in ASSIGNED).
    r = client.post(f"/api/v1/requests/{req_id}/assign", headers=hdr(admin),
                    json={"auto": True})
    assert r.status_code == 200, r.text
    trip_json = r.json()
    trip_id = trip_json["id"]
    print("TRIP DETAILS:", trip_json)
    print("DRIVER USER DETAILS:", client.get("/api/v1/auth/me", headers=hdr(driver)).json())
    assert trip_json["status"] == "assigned"

    # RBAC: hotel user must NOT be able to assign.
    assert client.post(f"/api/v1/requests/{req_id}/assign", headers=hdr(hotel),
                       json={"auto": True}).status_code == 403

    # 3b. Driver accepts the assignment.
    r = client.post(f"/api/v1/trips/{trip_id}/accept", headers=hdr(driver))
    assert r.status_code == 200, r.text
    assert r.json()["accepted_at"] is not None

    # 4. Driver walks the trip through collection with GPS.
    for i, target in enumerate(TRIP_CHAIN[:4]):
        r = client.post(f"/api/v1/trips/{trip_id}/advance", headers=hdr(driver), json={
            "target": target.value,
            "location": {"latitude": 10.53 + i * 0.001, "longitude": 76.21 + i * 0.001},
        })
        assert r.status_code == 200, f"{target}: {r.text}"
        assert r.json()["status"] == target.value

    # 5. Driver records collected quantity during collection.
    r = client.post(f"/api/v1/trips/{trip_id}/quantity", headers=hdr(driver), json={
        "collected_litres": 1080, "source": "flowmeter",
        "proof_photo_url": "https://storage.example/proof/1.jpg",
    })
    assert r.status_code == 200, r.text
    assert r.json()["collected_litres"] == 1080
    assert r.json()["variance_litres"] == 80

    # Continue the trip to its terminal state.
    for i, target in enumerate(TRIP_CHAIN[4:], start=4):
        r = client.post(f"/api/v1/trips/{trip_id}/advance", headers=hdr(driver), json={
            "target": target.value,
            "location": {"latitude": 10.53 + i * 0.001, "longitude": 76.21 + i * 0.001},
        })
        assert r.status_code == 200, f"{target}: {r.text}"
        assert r.json()["status"] == target.value

    # Invalid transition is rejected (already CLOSED).
    assert client.post(f"/api/v1/trips/{trip_id}/advance", headers=hdr(driver),
                       json={"target": "driver_started"}).status_code == 409
    assert client.post(f"/api/v1/trips/{trip_id}/quantity", headers=hdr(driver), json={
        "collected_litres": 1100,
    }).status_code == 409

    # Payment was auto-created; mark it paid via UPI.
    r = client.post(f"/api/v1/payments/trip/{trip_id}", headers=hdr(admin), json={
        "payment_mode": "upi", "payment_status": "paid", "transaction_id": "UPI123",
    })
    assert r.status_code == 200, r.text
    assert r.json()["payment_status"] == "paid"
    assert r.json()["amount"] == 540.0  # 1080 * 0.50 default rate

    # 6. Treatment centre records plant receipt + batch linkage.
    r = client.post(f"/api/v1/treatment/trips/{trip_id}/receipt", headers=hdr(plant),
                    json={"received_litres": 1075, "remarks": "OK"})
    assert r.status_code == 200, r.text
    assert r.json()["received_litres"] == 1075
    assert r.json()["batch_id"] is not None

    # 7. Live map + dashboard reflect the activity.
    r = client.get("/api/v1/tracking/live", headers=hdr(admin))
    assert r.status_code == 200 and len(r.json()) >= 1

    r = client.get("/api/v1/dashboard", headers=hdr(admin))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["today"]["trips_completed"] >= 1
    assert body["today"]["revenue"] == 540.0
    assert any(h["hotel_name"] == "Grand Riverside Hotel" for h in body["hotels"])

    print("\nFull workflow OK:")
    print(f"  request={req_id} trip={trip_id}")
    print(f"  revenue today = {body['today']['revenue']} {os.environ.get('CURRENCY','INR')}")
    print(f"  litres today  = {body['today']['total_litres']}")


if __name__ == "__main__":
    test_full_workflow()
    print("\nALL CHECKS PASSED")
