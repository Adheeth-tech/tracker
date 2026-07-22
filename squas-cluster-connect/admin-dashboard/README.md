# Admin dashboard (Squas control room)

Next.js / React admin dashboard for Squas operators (spec §4-Admin, §7-Admin Web
Dashboard). This is a **scaffold**: it ships a typed API client and the intended
structure so screens can be built against a known contract. It is not a finished
UI.

## Intended screens (spec §7)

- **Live map** — all vehicles on a map (`GET /tracking/live`), pending pickup
  points, route history. Use Google Maps or Mapbox (`MAPS_PROVIDER`).
- **Request management** — approve requests, assign tankers (auto or manual).
- **Vehicle/driver management** — CRUD over `/fleet/*`.
- **Hotel management** — approve registrations, view details.
- **Trip monitoring** — live trip statuses and GPS trails.
- **Payment dashboard** — pending payments, invoice generation.
- **Reports & exports** — daily/hotel-wise/fleet summaries; PDF/Excel export.
- **User management** — role assignment.

## Suggested structure

```
admin-dashboard/
├── package.json
├── src/
│   ├── lib/
│   │   ├── api.ts          # typed fetch client (provided)
│   │   └── types.ts        # shared types mirroring backend schemas (provided)
│   ├── app/                # Next.js app-router pages
│   │   ├── login/          # OTP login
│   │   ├── dashboard/      # GET /dashboard summary cards
│   │   ├── map/            # live vehicle map
│   │   ├── requests/       # approve + assign
│   │   ├── trips/          # monitor
│   │   ├── fleet/          # drivers + vehicles
│   │   ├── hotels/         # approvals
│   │   └── payments/       # pending + invoices
│   └── components/         # tables, map, status badges
└── .env.local             # NEXT_PUBLIC_API_BASE, NEXT_PUBLIC_MAPS_KEY
```

## Setup

```bash
cd admin-dashboard
npm install
echo 'NEXT_PUBLIC_API_BASE=http://localhost:8000/api/v1' > .env.local
npm run dev
```

The provided `src/lib/api.ts` handles OTP login, token storage and typed calls
to every backend endpoint, so screens are mostly rendering + calling
`api.something()`.
