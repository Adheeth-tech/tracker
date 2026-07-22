import urllib.request
import json
import sqlite3

import time

BASE = "http://localhost:8001/api/v1"

def test_live_registration():
    phone = f"+917777{int(time.time()) % 1000000:06d}"
    
    # 1. POST registration
    url = f"{BASE}/hotels"
    data = {
        "hotel_name": "Verify Live Hotel",
        "contact_person": "Live Operator",
        "phone": phone,
        "email": "live@verify.example",
        "address": "Verify Road, Thrissur",
        "latitude": 10.53,
        "longitude": 76.22,
        "gst_number": "32AAAAA1111A1Z1",
        "tank_location": "Backyard",
        "tank_capacity": 4000,
        "usual_volume": 1000,
        "usual_pickup_time": "09:00-11:00",
        "payment_type": "monthly_invoice"
    }
    
    req = urllib.request.Request(
        url, 
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(req) as res:
            status_code = res.status
            body = json.loads(res.read().decode("utf-8"))
            print("Registration status:", status_code)
            assert status_code == 201
            hotel_id = body["id"]
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code, e.read().decode())
        raise e
        
    # 2. Check the SQLite DB to ensure BOTH Hotel and User exist
    conn = sqlite3.connect("squas.db")
    cursor = conn.cursor()
    
    # Query hotel
    hotel = cursor.execute("SELECT id, hotel_name, phone FROM hotels WHERE phone = ?", (phone,)).fetchone()
    print("Hotel in database:", hotel)
    assert hotel is not None
    
    # Query user
    user = cursor.execute("SELECT id, phone, role, hotel_id FROM users WHERE phone = ?", (phone,)).fetchone()
    print("User in database:", user)
    assert user is not None
    assert user[2].lower() == "hotel"
    assert user[3] == hotel_id
    
    print("\nVerified: both Hotel and User successfully written to squas.db!")

if __name__ == "__main__":
    test_live_registration()
