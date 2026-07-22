# Squas Cluster Connect

**Wastewater Collection, Tracking & Compliance Platform**

A software framework implementing the *Squas Cluster Connect* technical
specification — a digital operations platform that makes decentralized
wastewater collection (hotels/institutions → tanker → Squas treatment centre)
transparent, measurable, trackable, auditable and payment-linked.

This repository is a **framework / scaffold**: a fully working backend that
implements the domain, the trip workflow engine, role-based access and every
spec module, plus structured starting points for the admin dashboard and the
mobile app. It is built to be extended, not to be a finished product.

```
squas-cluster-connect/
├── backend/            FastAPI + SQLAlchemy backend (runnable, tested)
├── admin-dashboard/    Next.js admin control room (scaffold + API client)
├── mobile-app/         Hotel + Driver app (structure + integration notes)
└── docs/               Architecture, data model, API guide
```

## What's implemented

The backend is complete and runnable. It covers all four roles (Hotel, Driver,
Admin, Treatment Centre Operator) and the full workflow from spec section 3:

> Hotel registers → raises pickup request → admin approves/assigns tanker →
> driver runs the trip (with GPS) → quantity recorded → payment captured →
> tanker reaches plant → receipt confirmed → invoice & reports generated.

An end-to-end test (`backend/tests/test_workflow.py`) exercises this entire
chain and passes.

## Quick start (backend)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env             # zero-config SQLite by default
python -m app.seed               # demo admin/hotel/driver/vehicle
uvicorn app.main:app --reload
```

Open **http://localhost:8000/docs** for interactive API docs.

Log in with OTP (echoed in the response in dev mode):

```bash
# request an OTP
curl -s -X POST localhost:8000/api/v1/auth/otp/request \
     -H 'content-type: application/json' -d '{"phone":"+919000000001"}'
# -> {"detail":"OTP sent","dev_otp":"123456"}

# verify to get a bearer token
curl -s -X POST localhost:8000/api/v1/auth/otp/verify \
     -H 'content-type: application/json' \
     -d '{"phone":"+919000000001","code":"123456"}'
```

Run the workflow test:

```bash
cd backend && python -m tests.test_workflow
```

## Spec → code map

| Spec section | Module | Where |
|---|---|---|
| 2. User roles | RBAC (Hotel/Driver/Admin/Treatment) | `app/core/enums.py`, `app/api/deps.py` |
| 3. Core workflow | Trip state machine | `app/workflow/trip_state_machine.py` |
| 4.1 Hotel registration | Hotels | `app/api/routers/hotels.py` |
| 4.2 Pickup request | Requests | `app/api/routers/requests.py` |
| 4.3 Vehicle/driver assignment | Fleet + assignment | `app/api/routers/fleet.py`, `app/services/assignment.py` |
| 4.4 Live tracking & map | Tracking | `app/api/routers/tracking.py` |
| 4.5 Trip execution | Trips | `app/api/routers/trips.py` |
| 4.6 Quantity measurement | Quantity | `app/api/routers/trips.py` (`/quantity`) |
| 4.7 Payment & billing | Payments | `app/api/routers/payments.py`, `app/services/billing.py` |
| 4.8 Treatment centre receipt | Treatment | `app/api/routers/treatment.py` |
| 4.9 Reporting & compliance | Reports | `app/api/routers/reports.py`, `app/services/reports.py` |
| 5–6 Data entities & fields | ORM models | `app/models/` |
| 8. Backend architecture | FastAPI app | `app/main.py` |
| 9. Notifications | Notification service | `app/services/notifications.py` |
| 10. Security & audit | RBAC + audit log | `app/api/deps.py`, `app/services/audit.py` |
| 11. MVP scope | — | all of the above |
| 12. Future enhancements | Hooks left in place | see `docs/architecture.md` |

## Technology choices

Per the spec's recommended architecture:

- **Backend:** FastAPI (Python) + SQLAlchemy 2.0
- **Database:** PostgreSQL in production (SQLite for zero-config local dev)
- **Auth:** OTP + role-based JWT
- **Admin dashboard:** Next.js / React
- **Mobile app:** Flutter or React Native (Hotel + Driver)
- **Maps:** Google Maps or Mapbox (provider configurable)
- **Storage:** S3 / GCS for proof photos
- **Notifications:** FCM / SMS / WhatsApp / email (pluggable drivers)

See `docs/architecture.md` for the full picture and `docs/data-model.md` for the
entity relationships.

## Status & next steps

This is an MVP-scope framework. Production hardening to add:
Alembic migrations, real notification/storage/payment-gateway integrations,
PDF/Excel report exporters, WebSocket live-map streaming, and the two frontend
apps built out against the documented API. These are called out inline as
`TODO`s and in `docs/architecture.md §Future work`.
