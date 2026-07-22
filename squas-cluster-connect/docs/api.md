# API reference

Base URL: `/api/v1`. Interactive docs (Swagger UI) at `/docs`, ReDoc at `/redoc`.
All routes except OTP request/verify and hotel self-registration require a
`Authorization: Bearer <token>` header. The role that may call each route is
shown in the **Roles** column.

## Auth

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/auth/otp/request` | public | Issue an OTP for a phone (echoed in dev) |
| POST | `/auth/otp/verify` | public | Exchange OTP for a bearer token |
| GET | `/auth/me` | any | Current user profile |

## Hotels (spec 4.1)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/hotels` | public | Register a hotel (starts `pending`) |
| GET | `/hotels` | admin | List all hotels |
| GET | `/hotels/{id}` | admin, own hotel | Hotel detail |
| POST | `/hotels/{id}/approve` | admin | Approve → `active` |

## Fleet (spec 4.3)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/fleet/drivers` | admin | Create driver |
| GET | `/fleet/drivers` | admin | List drivers |
| POST | `/fleet/vehicles` | admin | Create vehicle (optionally assign driver) |
| GET | `/fleet/vehicles` | admin | List vehicles |

## Requests & assignment (spec 4.2, 4.3)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/requests` | hotel, admin | Raise a pickup request |
| GET | `/requests` | hotel (own), admin | List requests (`?status_filter=`) |
| POST | `/requests/{id}/approve` | admin | Approve a request |
| POST | `/requests/{id}/assign` | admin | Assign tanker+driver → opens a Trip. Body `{vehicle_id, driver_id}` or `{auto:true}` |

## Trips & quantity (spec 4.5, 4.6)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/trips` | driver (own), admin | List trips (`?only_active=true`) |
| GET | `/trips/{id}` | any | Trip detail |
| GET | `/trips/{id}/next-states` | any | Allowed next statuses |
| POST | `/trips/{id}/advance` | driver, admin | Advance status; body `{target, location:{lat,lng}}` |
| POST | `/trips/{id}/quantity` | driver, hotel, admin | Record/confirm collected litres (auto-prices trip) |

## Tracking (spec 4.4)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/tracking/trips/{id}/ping` | driver, admin | Push a GPS ping |
| GET | `/tracking/trips/{id}` | hotel (own), admin | Recent GPS trail |
| GET | `/tracking/live` | admin | All vehicles' last-known positions |

## Payments & invoices (spec 4.7)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/payments/trip/{id}` | any | Trip payment |
| POST | `/payments/trip/{id}` | driver, hotel, admin | Create/update payment |
| GET | `/payments/pending` | admin | Unpaid payments |
| POST | `/payments/invoices/generate` | admin | Monthly hotel-wise invoice |
| GET | `/payments/invoices` | hotel (own), admin | List invoices |

## Treatment centre (spec 4.8)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/treatment/trips/{id}/receipt` | treatment, admin | Record plant receipt + batch link |

## Reports & notifications (spec 4.9, 8, 9)

| Method | Path | Roles | Purpose |
|---|---|---|---|
| GET | `/reports/daily` | admin | Daily litres/trips/revenue (`?day=`) |
| GET | `/reports/hotel-wise` | admin | Per-hotel totals |
| GET | `/reports/fleet-summary` | admin | Active trips + pending amount |
| GET | `/dashboard` | admin | Combined control-room summary |
| GET | `/notifications` | any | Notification feed (`?unread_only=true`) |

## Example: run one full pickup with curl

```bash
BASE=localhost:8000/api/v1
otp() { curl -s -X POST $BASE/auth/otp/request -H 'content-type: application/json' -d "{\"phone\":\"$1\"}" | python -c 'import sys,json;print(json.load(sys.stdin)["dev_otp"])'; }
tok() { c=$(otp $1); curl -s -X POST $BASE/auth/otp/verify -H 'content-type: application/json' -d "{\"phone\":\"$1\",\"code\":\"$c\"}" | python -c 'import sys,json;print(json.load(sys.stdin)["access_token"])'; }

ADMIN=$(tok +919000000001); HOTEL=$(tok +919000000010); DRIVER=$(tok +919000000020)

# hotel raises a request
curl -s -X POST $BASE/requests -H "Authorization: Bearer $HOTEL" \
  -H 'content-type: application/json' \
  -d '{"estimated_litres":1000,"wastewater_type":"kitchen"}'
```

The status codes follow HTTP conventions: `201` create, `200` ok, `401`
unauthenticated, `403` wrong role, `404` not found, `409` illegal state
transition (e.g. advancing a closed trip).
