# Driver operational-log transition contract

The admin dashboard relies on the backend as the source of truth for trip
workflow integrity. Driver-facing endpoints must enforce these rules server
side; hiding controls in the UI is not sufficient.

For every driver status update:

- Authenticate the driver and verify that the driver is assigned to the trip.
- Accept only the single valid next state from the current trip state. Reject
  skipped, reversed, duplicate, or future states with HTTP `409`.
- Reject all updates for `closed` and `cancelled` trips with HTTP `409`.
- Apply the transition and its timestamp atomically with the GPS/log record.
- Use the server timestamp; do not trust a client-supplied event time.
- Return the updated trip (including its current status/timestamps) so clients
  can immediately reconcile local state.

The current backend state machine already protects `/trips/{id}/advance` with
these sequential rules. The remaining operational-log gap is the quantity
endpoint: `/trips/{id}/quantity` currently accepts driver writes even after
the trip has moved beyond the collection workflow, including terminal states.
The backend must reject driver quantity writes unless the trip is in
`collection_started` or `collection_completed`; admin/hotel permissions can
remain governed by their existing business rules.

The admin transition endpoint may continue to use the existing
`GET /trips/{id}/next-states` and `POST /trips/{id}/advance` contract. The
dashboard surfaces backend rejection details directly so an invalid or stale
operation is visible to the administrator.
