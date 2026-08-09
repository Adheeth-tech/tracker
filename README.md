# Squas Cluster Connect

**Wastewater Collection, Tracking & Compliance Platform**

Squas Cluster Connect is a digital operations platform designed to make decentralized wastewater collection (Hotels/Institutions → Tanker → Squas Treatment Centre) transparent, measurable, trackable, auditable, and payment-linked.

This repository implements the backend workflows, databases, and structured frontend dashboard scaffolds for the different roles interacting with the platform.

---

## 🛠️ Components & Architecture

The workspace is organized into a modular structure:

```
squas-cluster-connect/
├── backend/            # FastAPI + SQLite/PostgreSQL backend API (runnable, tested)
├── admin-dashboard/    # Next.js admin control room (port 3000)
├── hotel-dashboard/    # Next.js hotel operations portal (port 3001)
├── driver-dashboard/   # Next.js driver fleet portal (port 3002)
└── docs/               # Architecture, data model, and API reference
```

## 💻 Technical Specifications & Tech Stack

This platform leverages a modern, robust, and type-safe stack designed for performance, rapid development, and offline-resilient operational workflows.

### 🐍 Backend API (`/squas-cluster-connect/backend`)
The backend is a robust REST API written in Python, adhering to clean architecture principles:
*   **Framework**: **FastAPI** (`0.115.*`) for asynchronous request handling, auto-generated interactive OpenAPI/Swagger documentation, and performance.
*   **ASGI Server**: **Uvicorn** (`>=0.30`) runs the high-performance local server.
*   **Database & ORM**:
    *   **SQLAlchemy** (`2.0.*`) as the Object-Relational Mapper (ORM) using a modular models approach.
    *   **SQLite** (local SQLite database `squas.db`) with `sqlalchemy-sqlitecloud` (`>=0.1.0`) is configured for quick, zero-config local development and testing.
    *   **PostgreSQL** (production deployment database) with the **psycopg2-binary** (`>=2.9`) driver.
*   **Data Validation & Settings**: **Pydantic** (`2.*`) and **Pydantic Settings** (`>=2.0`) handle input validation and environment configuration parsing.
*   **Security & JWT Auth**:
    *   **python-jose[cryptography]** (`>=3.3`) for robust JWT generation and validation.
    *   **passlib[bcrypt]** (`>=1.7`) for secure user credential/OTP management.
    *   **python-multipart** (`>=0.0.9`) to handle multipart form data for driver uploads (e.g. proof images).

### ⚛️ Frontend Web Dashboards (`admin-dashboard`, `hotel-dashboard`, `driver-dashboard`)
All three dashboards are built using the same core web technology stack:
*   **Framework**: **Next.js** (`^14.2.0`) with **React** (`^18.3.0`), providing optimized Server-Side Rendering (SSR) and Client-Side Routing.
*   **Language**: **TypeScript** (`^5`) for strict compile-time type-safety across API requests and component interfaces.
*   **Styling**: **Tailwind CSS** (`^3.4.19`) with **PostCSS** (`^8.5.19`) and **Autoprefixer** (`^10.5.2`) for a premium utility-first responsive layout.
*   **Icons**: **Lucide React** (`^1.24.0`) is utilized for clean, unified SVG icons.
*   **Geospatial & Mapping**:
    *   **Leaflet** (`^1.9.4`) with `@types/leaflet` (`^1.9.21`) for general interactive maps.
    *   **Mapbox GL** (`^3.27.0`) with `@types/mapbox-gl` (`^3.4.1`) for live geospatial tracking, route navigation, and telemetry visualization.
*   **Typography**: Loaded locally/custom via `@fontsource/ibm-plex-sans` and `@fontsource/ibm-plex-mono`.

### 📱 Mobile App (Proposed Scaffold `/mobile-app`)
*   **Framework**: Suggested as a cross-platform mobile stack using **Flutter** or **React Native** (TypeScript).
*   **Features**: Role-based routing (loaded post-OTP verification), background GPS polling, camera/gallery integration for receipt/proof uploads, and offline-safe HTTP queueing for pings.

---

## ✨ Key Functionalities

- **Role-Based Access Control (RBAC)**: Supports roles for Admins, Hotels, Drivers, and Treatment Centre Operators via OTP authentication.
- **Pickup Workflow Engine**: A comprehensive state-machine to manage the lifecycle of requests and trips:
  Hotel raises a request → Admin approves and dispatches a tanker/driver → Driver runs the trip (recording GPS coordinates) → Quantity is recorded → Payment is verified → Tanker drops off at the treatment centre → Treatment operator confirms receipt.
- **Admin Control Room Dashboard**: Live map tracking of vehicles, fleet management, request dispatch, hotel approval, payment monitoring, and reports.
- **Hotel Portal Dashboard**: Allows hotels to raise pickup requests, view pickup history, download monthly invoices, and update capacity information.
- **Driver Portal Dashboard**: Allows drivers to view current trip assignments, log trip execution events (e.g. quantity filled), and navigate routes.
- **Billing & Compliance Audit Logs**: End-to-end ledger of quantity verification, invoices, and compliant wastewater disposals.

---

## 🚀 How to Run the Platform

Follow these steps to spin up the backend API and the frontend dashboards:

### 1. Start the Backend API (Port 8000)

Open a terminal, navigate to the backend folder, set up your virtual environment, seed the database, and run the FastAPI server:

```bash
# Navigate to backend directory
cd \tracker\squas-cluster-connect\backend

# Create virtual environment (if not already done)
python -m venv .venv

# Activate virtual environment
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file from template (uses SQLite by default)
cp .env.example .env

# Seed the database with demo users/vehicles
python -m app.seed

# Start the backend server
uvicorn app.main:app --reload
```

Once started, access the interactive API Swagger documentation at: `http://localhost:8000/docs`.

### 2. Start the Frontend Dashboards

Ensure the backend is running first. Open a new, separate terminal for each dashboard you want to start:

#### 💼 Admin Dashboard (Port 3000)

Used by Squas operators and dispatch managers.

```bash
cd c:\Users\adhee\tracker\squas-cluster-connect\admin-dashboard
npm install   # If running for the first time
npm run dev
```

Link: `http://localhost:3000`

#### 🏨 Hotel Dashboard (Port 3001)

Used by hotel managers to request pickups.

```bash
cd c:\Users\adhee\tracker\squas-cluster-connect\hotel-dashboard
npm install   # If running for the first time
npm run dev
```

Link: `http://localhost:3001`

#### 🚛 Driver Dashboard (Port 3002)

Used by tanker drivers to track their assigned route.

```bash
cd c:\Users\adhee\tracker\squas-cluster-connect\driver-dashboard
npm install   # If running for the first time
npm run dev
```

Link: `http://localhost:3002`

---

## 🔑 Seeded Demo Credentials (OTP Auth)

When logging in to any of the dashboards, request an OTP for the phone number. In development mode, the OTP is mocked and echoed back in the terminal/network response (defaults to `123456`).

| Role | Name | Phone Number | Description |
|---|---|---|---|
| Admin | Squas Admin | +919000000001 | Full administrative control & dispatch panel |
| Plant Operator | Plant Operator | +919000000002 | Treatment centre verification panel |
| Hotel Owner | Anita Menon | +919000000010 | Registered to Grand Riverside Hotel |
| Driver | Rajesh Kumar | +919000000020 | Tanker driver (Vehicle: KL-08-AB-1234) |

## ⚙️ Configuration (.env.local)

Each dashboard contains a `.env.local` file pointing to the backend API:

```
NEXT_PUBLIC_API_BASE=http://localhost:8000/api/v1
```

If you change the port of the backend, make sure to update `NEXT_PUBLIC_API_BASE` in the `.env.local` files of all dashboards.

---

## 📸 Walkthrough: End-to-End Pickup Lifecycle

The screenshots below trace a single pickup request — from a hotel raising it, through admin approval and dispatch, driver execution, and finally invoicing — across all three dashboards. Login screens and empty/blank dashboard views are omitted for brevity.

### 1. Hotel raises a pickup request

The hotel operator fills out a new pickup request, specifying date, time window, estimated litres, wastewater type, urgency, and any driver access instructions.

![Hotel raises a new pickup request](https://github.com/Adheeth-tech/tracker/blob/main/squas-cluster-connect/docs/screenshots/01-hotel-new-pickup-request.png)

Once submitted, the request appears in the hotel's own list in the **Requested** state, awaiting admin approval.

![Hotel view of request in Requested state](https://github.com/Adheeth-tech/tracker/blob/main/squas-cluster-connect/docs/screenshots/02-hotel-request-requested-status.png)

### 2. Admin reviews and approves the request

The request also surfaces on the admin side (Control Room → Requests), where the admin can approve it.

![Admin sees the pending request and approves it](https://github.com/Adheeth-tech/tracker/blob/main/squas-cluster-connect/docs/screenshots/03-admin-requests-pending-approval.png)

Once approved, the status updates and an **Assign Tanker** action becomes available.

![Request now shows Approved status with Assign Tanker action](https://github.com/Adheeth-tech/tracker/blob/main/squas-cluster-connect/docs/screenshots/04-admin-request-approved.png)

### 3. Admin assigns a driver and tanker

The admin dispatches a tanker, either via system auto-assignment or manual selection of an available vehicle and driver.

![Admin dispatch modal for selecting vehicle and driver](https://github.com/Adheeth-tech/tracker/blob/main/squas-cluster-connect/docs/screenshots/05-admin-dispatch-tanker-modal.png)

### 4. Driver receives and accepts the assignment

The assigned driver sees the new job appear under **Active Jobs**, awaiting their acceptance.

![Driver sees a new job assignment awaiting acceptance](https://github.com/Adheeth-tech/tracker/blob/main/squas-cluster-connect/docs/screenshots/06-driver-new-job-awaiting-acceptance.png)

After accepting, the driver sees the full job ticket — hotel details, pickup/drop locations, vehicle and load info — and can start the trip.

![Driver accepts the job and starts the trip](https://github.com/Adheeth-tech/tracker/blob/main/squas-cluster-connect/docs/screenshots/07-driver-job-accepted-start-trip.png)

### 5. Driver executes the trip, updating status along the way

As the driver progresses, they advance the trip through each operational stage (e.g. reached hotel, loading started, loading completed) using the Telemetry Status Controls.

![Driver updates trip status via telemetry controls](https://github.com/Adheeth-tech/tracker/blob/main/squas-cluster-connect/docs/screenshots/08-driver-telemetry-status-controls.png)

Throughout the trip, both the **admin** and the **hotel owner** can view the driver's live status and current task:

- The admin monitors active trips and can view live telemetry from the Control Room.

  ![Admin monitors live trip status](https://github.com/Adheeth-tech/tracker/blob/main/squas-cluster-connect/docs/screenshots/09-admin-trips-live-monitoring.png)

- The hotel owner sees the same trip's operational delivery timeline, with each completed step timestamped.

  ![Hotel view of trip tracking timeline](https://github.com/Adheeth-tech/tracker/blob/main/squas-cluster-connect/docs/screenshots/10-hotel-trip-tracking-timeline.png)

### 6. Driver logs the collected quantity

Just before leaving the hotel, the driver logs the actual collected litres and collection method — this figure feeds directly into billing.

![Driver logs collected volume after loading is completed](https://github.com/Adheeth-tech/tracker/blob/main/squas-cluster-connect/docs/screenshots/11-driver-loading-completed-log-volume.png)

The driver can also record payment details (rate per litre, payment status, and mode) associated with the trip.

![Driver updates billing and payment record](https://github.com/Adheeth-tech/tracker/blob/main/squas-cluster-connect/docs/screenshots/12-driver-billing-record-payment.png)

### 7. Admin generates the invoice

Only the admin can generate the client-facing invoice, consolidating litres cleared and total amount for the hotel over a selected date range.

![Admin generates invoice from pending payments](https://github.com/Adheeth-tech/tracker/blob/main/squas-cluster-connect/docs/screenshots/13-admin-generate-invoice.png)

### 8. Completion

Once the full cycle is done, the request is marked **Completed** across the system — visible to the admin as the closing state of the workflow.

![Requests marked Completed after full cycle](https://github.com/Adheeth-tech/tracker/blob/main/squas-cluster-connect/docs/screenshots/14-admin-requests-completed.png)

---

### Request & Trip States (Compiled Reference)

**Request lifecycle**: `Requested` → `Approved` → `Assigned` → `Completed`

**Trip lifecycle**: `Assigned` → `Driver En Route` → `Reached Hotel` → `Loading Started` → `Loading Completed` → `Payment Collected` → `Moving to Plant` → `Delivery Completed (Closed)`

(`Cancelled` is available as an exception state at multiple points in the trip lifecycle.)
