# User flow

This document describes the current web workflow for hotel users, drivers, and
administrators.

## 1. Hotel registration and pickup

1. A hotel opens the hotel dashboard registration page.
2. The hotel enters its business and tank details.
3. The hotel selects **Use Current Location**, or opens **Pick on Map** to
   search for the hotel by address, choose a result, click the map, or drag the
   pin to refine the location. The selected point is reverse-geocoded into the
   postal address; no sample latitude or longitude is pre-filled.
4. The registration is created with `PENDING` status and an OTP login account.
5. An administrator approves the hotel from **Hotels**.
6. After approval, the hotel logs in and creates a pickup request.
7. The request remains visible to the hotel throughout the operational lifecycle.

If the hotel location is not captured, registration is blocked because road
navigation requires a destination coordinate.

## 2. Driver registration and approval

1. A driver opens the driver dashboard registration page.
2. The driver submits name, phone, and license details.
3. The driver account and driver record are created with `PENDING` status.
4. The driver may log in, but the dashboard remains locked until approval.
5. An administrator opens **Fleet → Drivers** and selects **Approve**.
6. The driver can then access jobs, accept trips, update trip status, send GPS
   telemetry, and use road navigation.

Pending or inactive drivers cannot be assigned vehicles or trips.

## 3. Request approval and tanker assignment

1. The administrator reviews a hotel pickup request.
2. The administrator approves the request.
3. The administrator selects **Assign Tanker**.
4. The system can automatically select an available tanker with an active,
   approved driver, or the administrator can choose a tanker manually.
5. The backend validates that the tanker and driver belong together and that
   both are available/active.
6. A trip is created, the tanker becomes `ON_TRIP`, and the driver receives a
   job notification.

### Reassigning a tanker

1. For an assigned trip that the driver has not accepted, the administrator
   selects **Edit Assignment**.
2. The administrator chooses another available tanker/driver or uses automatic
   assignment.
3. The previous tanker is released, the new tanker becomes `ON_TRIP`, and the
   assignment is written to the audit log.
4. The previous driver, new driver, and hotel receive assignment notifications.

Reassignment is locked after the driver accepts the trip. This prevents the
driver and operations team from working against different assignments.

## 4. Driver trip and location flow

1. The driver accepts the job.
2. The driver starts the trip. The browser requests device location access.
3. Status transitions and live tracking use GPS captured from the driver device.
4. The driver dashboard calculates the road route through Mapbox using the
   current device location and the hotel/plant destination.
5. The driver advances through arrival, collection, plant delivery, unloading,
   and closure states.

Administrators can update operational status for support purposes, but admin
status changes do not create fake GPS points. GPS breadcrumbs come from driver
telemetry or a real device location attached to a driver action.

## 5. Quantity and payment flow

1. The driver records the collected quantity.
2. The hotel may confirm the quantity.
3. The driver submits the payment mode, reference, and available rate/details.
4. The driver billing form disappears and the record moves to the Admin pending
   payments queue.
5. Admin reviews the record and records the final payment status. Only Admin can
   approve/finalize a payment as `PAID`.
6. Once payment is `PAID`, it is removed from the active pending-payment list.
7. The trip timeline retains the paid amount, mode, timestamp, and transaction
   reference for audit/history.
8. The detailed billing card is hidden after driver submission/finalization so the active
   operations view stays focused on outstanding work.

## 6. Admin live monitoring

1. The admin tracking page polls live vehicle positions.
2. Vehicles with recent driver telemetry appear on the live map.
3. The admin can select a vehicle/trip to inspect its trail and planned route.
4. If no live locations are available, the map starts in a neutral world view
   and fits to available hotel/vehicle data instead of showing a fake local
   position.
