# Architecture

## Overview

Squas Cluster Connect is a three-tier system: mobile/web clients → REST API →
PostgreSQL, with the trip workflow engine as the domain core. Every state change
in the physical process (a tanker starting, arriving, collecting, unloading) is
mirrored by a validated state transition in the backend, which is what makes the
whole operation auditable "from hotel request to treatment-centre receipt".

```
┌────────────────┐   ┌────────────────┐   ┌────────────────────┐
│  Hotel app     │   │  Driver app    │   │  Admin dashboard   │
│  (Flutter/RN)  │   │  (Flutter/RN)  │   │  (Next.js/React)   │
└───────┬────────┘   └───────┬────────┘   └─────────┬──────────┘
        │  HTTPS + Bearer JWT (OTP login)           │
        └───────────────────┬───────────────────────┘
                            ▼
              ┌──────────────────────────────┐
              │        FastAPI backend        │
              │  routers → services → models  │
              │  ┌────────────────────────┐   │
              │  │  Trip workflow engine   │  │  ← single source of truth for
              │  └────────────────────────┘   │    trip/request state
              └───────────────┬───────────────┘
                              ▼
                     ┌─────────────────┐   ┌──────────────┐
                     │   PostgreSQL     │   │  S3 / GCS     │ (proof photos)
                     └─────────────────┘   └──────────────┘
        External: Google Maps/Mapbox · FCM/SMS/WhatsApp · UPI gateway
```

## Layering

The backend is deliberately layered so responsibilities don't leak:

- **Routers** (`app/api/routers/`) — HTTP concerns only: parse, authorise
  (via `deps.require_roles`), call a service or the workflow engine, serialise.
- **Workflow engine** (`app/workflow/trip_state_machine.py`) — the trip
  lifecycle rules. Pure functions; no DB. Routers never mutate `trip.status`
  directly — they call `apply_transition()`, which guarantees timestamps,
  request-status roll-up and vehicle release happen together.
- **Services** (`app/services/`) — reusable domain logic: assignment heuristics,
  billing/pricing, reporting aggregations, audit logging, notification dispatch,
  code generation. These are where future integrations plug in.
- **Models** (`app/models/`) — SQLAlchemy ORM, one file per bounded area.
- **Core** (`app/core/`) — config, DB session, security (JWT/OTP), enums.

## Two-level status model

The spec lists slightly different status vocabularies in §4.2 and §4.5. The
framework reconciles them with **two related state machines**:

- `RequestStatus` — the hotel-facing lifecycle
  (requested → approved → assigned → in_progress → collected → received_at_plant
  → completed → invoiced → paid).
- `TripStatus` — the granular operational/driver lifecycle from §4.5
  (assigned → driver_started → reached_hotel → collection_started →
  collection_completed → moving_to_plant → reached_plant → unloaded → closed).

The workflow engine maps each trip transition onto the correct request status,
so the hotel always sees a meaningful high-level status while operations keep
fine-grained control. See `_REQUEST_STATUS_MAP` in the engine.

## Auth & RBAC (spec §8, §10)

- Login is **OTP + role-based JWT**. `POST /auth/otp/request` issues a code
  (delivered via SMS/WhatsApp in production; echoed in dev). `POST
  /auth/otp/verify` exchanges it for a bearer token carrying the user's role.
- `require_roles(*roles)` builds a FastAPI dependency that both authenticates
  and authorises. Row-level scoping (a hotel user only sees its own hotel;
  a driver only its own trips) is enforced inside routers.
- RBAC is mandatory and applied on every non-public route.

## Auditability (spec §10)

Every important action (`request_created`, `request_assigned`,
`trip_status_change`, `quantity_recorded`, `payment_updated`,
`plant_receipt_recorded`, `invoice_generated`, `login`, …) is written to an
append-only `audit_logs` table via `services/audit.record()`. GPS breadcrumbs
(`location_logs`) and proof-photo URLs give tamper-resistant evidence for each
trip. An admin can reconstruct the full history of any trip from these tables.

## Traceability chain (spec §4.8, §14)

Every litre is traceable: `Hotel → PickupRequest → Trip → QuantityRecord →
PlantReceipt → TreatmentBatch`, with `Payment`/`Invoice` linked to the trip.
The `QuantityRecord` holds estimated, driver-entered, hotel-confirmed and
plant-received figures plus computed variance, which is the transparency core
of the platform.

## Data flow: one pickup

1. Hotel `POST /requests` → `PickupRequest(REQUESTED)` + notification.
2. Admin `POST /requests/{id}/approve` → `APPROVED`.
3. Admin `POST /requests/{id}/assign` (manual or `auto:true`) → creates
   `Trip(ASSIGNED)`, marks vehicle `ON_TRIP`, request `ASSIGNED`.
4. Driver `POST /trips/{id}/advance` through the chain; each call logs GPS,
   stamps the milestone timestamp, rolls up the request status, notifies.
5. Driver `POST /trips/{id}/quantity` → `QuantityRecord`, auto-prices a
   `Payment`.
6. Admin/hotel `POST /payments/trip/{id}` → payment status; `PAID` sets request
   `PAID`.
7. Operator `POST /treatment/trips/{id}/receipt` → `PlantReceipt` + batch link +
   variance reconciliation.
8. Admin reads `/dashboard`, `/reports/*`, generates invoices.

## Configuration

All environment-specific values live in `app/core/config.py` (loaded from
`.env`): database URL, secret key, OTP TTL, maps provider/key, storage bucket,
notification gateway keys, default rate-per-litre and currency. Nothing is
hard-coded across the codebase.

## Future work (spec §12)

The framework leaves clean seams for each planned enhancement:

- **Auto-route optimization** — extend `services/assignment.py` (`score_vehicle`,
  `auto_assign` already provide the hook).
- **IoT flowmeter integration** — `QuantitySource.FLOWMETER` and the quantity
  endpoint already model meter readings; add an ingestion endpoint/webhook.
- **QR-code pickup verification / digital signature** — add fields to the trip
  and a verification step before `COLLECTION_STARTED`.
- **UPI payment gateway** — replace the manual `payments` upsert with a gateway
  callback; `Payment.transaction_id`/`receipt_url` are already present.
- **Sludge-estimate dashboard** — `TreatmentBatch.sludge_estimate_litres` is
  modelled; add the analytics query in `services/reports.py`.
- **Regulatory report auto-generation / municipality dashboard** — add exporters
  (PDF/Excel) and a scoped read-only role.
- **Real-time live map** — swap polling `/tracking/live` for a WebSocket stream.
