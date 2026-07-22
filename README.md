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

---

## ✨ Key Functionalities

1. **Role-Based Access Control (RBAC)**: Supports roles for Admins, Hotels, Drivers, and Treatment Centre Operators via OTP authentication.
2. **Pickup Workflow Engine**: A comprehensive state-machine to manage the lifecycle of requests and trips:
   * Hotel raises a request → Admin approves and dispatches a tanker/driver → Driver runs the trip (recording GPS coordinates) → Quantity is recorded → Payment is verified → Tanker drops off at the treatment centre → Treatment operator confirms receipt.
3. **Admin Control Room Dashboard**: Live map tracking of vehicles, fleet management, request dispatch, hotel approval, payment monitoring, and reports.
4. **Hotel Portal Dashboard**: Allows hotels to raise pickup requests, view pickup history, download monthly invoices, and update capacity information.
5. **Driver Portal Dashboard**: Allows drivers to view current trip assignments, log trip execution events (e.g. quantity filled), and navigate routes.
6. **Billing & Compliance Audit Logs**: End-to-end ledger of quantity verification, invoices, and compliant wastewater disposals.

---

## 🚀 How to Run the Platform

Follow these steps to spin up the backend API and the frontend dashboards:

### 1. Start the Backend API (Port 8000)
Open a terminal, navigate to the `backend` folder, set up your virtual environment, seed the database, and run the FastAPI server:

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
* Once started, access the interactive API Swagger documentation at: **[http://localhost:8000/docs](http://localhost:8000/docs)**.

---

### 2. Start the Frontend Dashboards
Ensure the backend is running first. Open a new, separate terminal for each dashboard you want to start:

#### 💼 Admin Dashboard (Port 3000)
Used by Squas operators and dispatch managers.
```bash
cd c:\Users\adhee\tracker\squas-cluster-connect\admin-dashboard
npm install   # If running for the first time
npm run dev
```
* **Link**: [http://localhost:3000](http://localhost:3000)

#### 🏨 Hotel Dashboard (Port 3001)
Used by hotel managers to request pickups.
```bash
cd c:\Users\adhee\tracker\squas-cluster-connect\hotel-dashboard
npm install   # If running for the first time
npm run dev
```
* **Link**: [http://localhost:3001](http://localhost:3001)

#### 🚛 Driver Dashboard (Port 3002)
Used by tanker drivers to track their assigned route.
```bash
cd c:\Users\adhee\tracker\squas-cluster-connect\driver-dashboard
npm install   # If running for the first time
npm run dev
```
* **Link**: [http://localhost:3002](http://localhost:3002)

---

## 🔑 Seeded Demo Credentials (OTP Auth)

When logging in to any of the dashboards, request an OTP for the phone number. In development mode, the OTP is mocked and echoed back in the terminal/network response (defaults to `123456`).

| Role | Name | Phone Number | Description |
|---|---|---|---|
| **Admin** | Squas Admin | `+919000000001` | Full administrative control & dispatch panel |
| **Hotel Owner** | Anita Menon | `+919000000010` | Registered to *Grand Riverside Hotel* |
| **Driver** | Rajesh Kumar | `+919000000020` | Tanker driver (Vehicle: `KL-08-AB-1234`) |

---

## ⚙️ Configuration (.env.local)

Each dashboard contains a `.env.local` file pointing to the backend API:
```env
NEXT_PUBLIC_API_BASE=http://localhost:8000/api/v1
```
*If you change the port of the backend, make sure to update `NEXT_PUBLIC_API_BASE` in the `.env.local` files of all dashboards.*
