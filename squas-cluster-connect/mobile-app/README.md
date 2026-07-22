# Mobile app (Hotel + Driver)

A single cross-platform app serving two roles (spec §7). Recommended:
**Flutter** or **React Native**. The role in the auth token decides which
navigation stack loads after login.

## Hotel screens (spec §7-Hotel)

- **Request pickup** — date, time window, estimated litres, wastewater type,
  access instructions, urgency → `POST /requests`.
- **Live tracking** — assigned tanker on a map with ETA, driver contact, status
  → `GET /tracking/trips/{id}` (poll or WebSocket).
- **Pickup history** — `GET /requests` (scoped to the hotel).
- **Invoices & payment** — `GET /payments/invoices`, confirm/record payment.
- **Notifications** — `GET /notifications`.
- **Profile & tank details** — hotel record.

## Driver screens (spec §7-Driver)

- **Today's trips** — `GET /trips?only_active=true` (scoped to the driver).
- **Navigation** — turn-by-turn to the hotel, then to the plant (Maps SDK).
- **Status buttons** — one button per allowed next state
  (`GET /trips/{id}/next-states` → `POST /trips/{id}/advance` with GPS).
- **Quantity entry** — `POST /trips/{id}/quantity` (manual/flowmeter + photo).
- **Photo upload** — proof image → object storage, URL sent with quantity.
- **Payment collection** — `POST /payments/trip/{id}`.
- **Plant delivery** — the driver marks `unloaded`; the treatment operator
  confirms the receipt.

## Background GPS

While a trip is active, the driver app should push periodic pings to
`POST /tracking/trips/{id}/ping` so hotels and admin see live movement. Throttle
to ~10–20s and batch when offline.

## Auth flow

1. Enter phone → `POST /auth/otp/request`.
2. Enter OTP → `POST /auth/otp/verify` → store bearer token securely
   (Keychain / Keystore).
3. Attach `Authorization: Bearer <token>` to every request.
4. Route by `role` claim: `hotel` → hotel stack, `driver` → driver stack.

## Suggested structure (Flutter shown)

```
mobile-app/
├── pubspec.yaml
└── lib/
    ├── main.dart
    ├── api/            # client mirroring admin-dashboard/src/lib/api.ts
    ├── auth/           # OTP login + token store + role routing
    ├── hotel/          # hotel screens
    ├── driver/         # driver screens
    ├── tracking/       # map + GPS service
    └── shared/         # status badges, models, theme
```

The backend contract is identical to the one documented in `docs/api.md`; the
TypeScript client in `admin-dashboard/src/lib/api.ts` is a useful reference when
writing the Dart/JS client here.
