# Data model

Entities and fields follow spec sections 5 and 6. All models live in
`backend/app/models/` and share `created_at` / `updated_at` timestamps
(except append-only logs).

## Entity relationship diagram

```mermaid
erDiagram
    HOTEL ||--o{ PICKUP_REQUEST : raises
    HOTEL ||--o{ USER : "has hotel users"
    HOTEL ||--o{ INVOICE : "billed via"
    DRIVER ||--o| USER : "has driver user"
    DRIVER ||--o| VEHICLE : "assigned"
    DRIVER ||--o{ TRIP : drives
    VEHICLE ||--o{ TRIP : "runs"
    PICKUP_REQUEST ||--o| TRIP : "fulfilled by"
    TRIP ||--o| QUANTITY_RECORD : measures
    TRIP ||--o| PAYMENT : "billed by"
    TRIP ||--o| PLANT_RECEIPT : "received as"
    TRIP ||--o{ LOCATION_LOG : "GPS trail"
    TREATMENT_BATCH ||--o{ PLANT_RECEIPT : contains
    INVOICE ||--o{ PAYMENT : groups
    USER ||--o{ AUDIT_LOG : performs
    USER ||--o{ NOTIFICATION : receives

    HOTEL {
        int id PK
        string hotel_name
        string contact_person
        string phone
        string email
        string address
        float latitude
        float longitude
        string gst_number
        float tank_capacity
        float usual_volume
        enum payment_type
        enum status
    }
    VEHICLE {
        int id PK
        string vehicle_number
        float capacity_litres
        int driver_id FK
        string gps_device_id
        enum status
        date last_service_date
        float last_lat
        float last_lng
    }
    PICKUP_REQUEST {
        int id PK
        string request_code
        int hotel_id FK
        date requested_date
        string time_window
        float estimated_litres
        enum wastewater_type
        enum urgency
        enum status
    }
    TRIP {
        int id PK
        string trip_code
        int request_id FK
        int driver_id FK
        int vehicle_id FK
        enum status
        datetime assigned_at
        datetime started_at
        datetime arrived_at
        datetime collected_at
        datetime plant_received_at
        datetime completed_at
    }
    QUANTITY_RECORD {
        int id PK
        int trip_id FK
        float estimated_litres
        float driver_entered_litres
        float hotel_confirmed_litres
        float plant_received_litres
        float collected_litres
        float variance_litres
        enum source
        string proof_photo_url
    }
    PAYMENT {
        int id PK
        int trip_id FK
        float rate_per_litre
        float quantity_litres
        float amount
        enum payment_mode
        enum payment_status
        string transaction_id
        int invoice_id FK
    }
    PLANT_RECEIPT {
        int id PK
        int trip_id FK
        int batch_id FK
        float received_litres
        datetime unloaded_at
    }
    TREATMENT_BATCH {
        int id PK
        string batch_code
        float total_received_litres
        float sludge_estimate_litres
    }
    LOCATION_LOG {
        int id PK
        int trip_id FK
        int vehicle_id FK
        float latitude
        float longitude
        float speed
        datetime timestamp
    }
    INVOICE {
        int id PK
        string invoice_code
        int hotel_id FK
        float total_litres
        float total_amount
        enum status
    }
```

## Enumerations

Defined once in `app/core/enums.py` and shared by models, schemas and the
workflow engine:

- **Role** — hotel, driver, admin, treatment
- **HotelStatus** — pending, active, suspended
- **VehicleStatus** — available, on_trip, maintenance, inactive
- **WastewaterType** — greywater, kitchen, mixed, blackwater, other
- **Urgency** — normal, high, urgent
- **RequestStatus** — requested → approved → assigned → in_progress → collected →
  received_at_plant → completed → invoiced → paid (+ cancelled)
- **TripStatus** — assigned → driver_started → reached_hotel → collection_started
  → collection_completed → moving_to_plant → reached_plant → unloaded → closed
  (+ cancelled)
- **PaymentMode** — cash, upi, bank_transfer, credit, monthly_invoice
- **PaymentStatus** — unpaid, partial, paid
- **InvoiceStatus** — draft, issued, paid, cancelled
- **QuantitySource** — manual, flowmeter, tank_level, photo, plant_confirmation
- **NotificationChannel** — push, sms, whatsapp, email

## Notes

- `request_code`, `trip_code`, `invoice_code`, `batch_code` are human-facing IDs
  (`REQ-2026-000001`, etc.) generated in `services/codes.py`, alongside the
  integer primary keys.
- `QuantityRecord` stores the four independent readings the spec calls for
  (driver, hotel, plant, and the reconciled `collected_litres`) plus a computed
  `variance_litres` — this is the billing and transparency source of truth.
- `AuditLog` and `LocationLog` are append-only (no `updated_at`).
