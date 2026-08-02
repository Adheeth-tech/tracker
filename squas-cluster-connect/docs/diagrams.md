# Squas Cluster Connect diagrams

This page is the visual index for the three independently deployed dashboards,
the FastAPI service, and the trip data lifecycle. The diagrams use Mermaid so
they render in GitHub, GitLab, and compatible Markdown documentation systems.

## System architecture

```mermaid
flowchart LR
    subgraph Clients[Independently deployed clients]
        A[Admin dashboard<br/>Next.js / React]
        D[Driver dashboard<br/>Next.js / React]
        H[Hotel dashboard<br/>Next.js / React]
    end

    subgraph API[Backend service]
        AUTH[OTP authentication<br/>JWT + RBAC]
        ROUTERS[FastAPI routers]
        WF[Trip workflow engine<br/>validated transitions]
        SERVICES[Domain services<br/>assignment · billing · audit · notifications]
    end

    DB[(SQLite / PostgreSQL<br/>authoritative operational data)]
    MAP[Mapbox APIs<br/>tiles + road routes]
    MSG[Notification providers<br/>SMS · WhatsApp · push]

    A -->|HTTPS + Bearer JWT| AUTH
    D -->|HTTPS + Bearer JWT| AUTH
    H -->|HTTPS + Bearer JWT| AUTH
    AUTH --> ROUTERS
    ROUTERS --> WF
    ROUTERS --> SERVICES
    WF --> DB
    SERVICES --> DB
    SERVICES --> MSG
    A -->|live vehicles + trip routes| MAP
    D -->|navigation route| MAP
    H -->|trip progress route| MAP
    ROUTERS -.->|GPS, trips, requests, payments| DB
```

Each dashboard is built and deployed independently. They share API contracts,
workflow rules, and visual conventions, but do not share a runtime bundle.

## End-to-end pickup sequence

```mermaid
sequenceDiagram
    autonumber
    actor Hotel
    actor Admin
    actor Driver
    participant API as FastAPI API
    participant WF as Trip workflow
    participant DB as Operational database
    participant Map as Mapbox

    Hotel->>API: Create pickup request
    API->>DB: Save request = requested
    Admin->>API: Approve and assign tanker
    API->>DB: Save request = assigned<br/>create trip = assigned
    API-->>Driver: Assignment notification
    Driver->>API: Accept trip
    Driver->>API: Advance trip + device GPS
    API->>WF: Validate next state
    WF->>DB: Save status, milestone, GPS breadcrumb
    Driver->>Map: Request road route from current position
    Map-->>Driver: Route geometry + ETA
    Driver->>API: Record collected quantity
    API->>DB: Save quantity + create payment
    Hotel->>API: Confirm quantity
    Admin->>API: Finalize payment
    Driver->>API: Reach plant, unload, close trip
    API->>WF: Validate remaining states
    WF->>DB: Save terminal state and audit events
```

## Trip state machine

```mermaid
stateDiagram-v2
    [*] --> assigned
    assigned --> driver_started: driver accepts + starts
    driver_started --> reached_hotel: arrive at hotel
    reached_hotel --> collection_started: begin collection
    collection_started --> collection_completed: finish collection
    collection_completed --> moving_to_plant: leave hotel
    moving_to_plant --> reached_plant: arrive at plant
    reached_plant --> unloaded: unload recorded
    unloaded --> closed: close trip

    assigned --> cancelled: cancel
    driver_started --> cancelled: cancel
    reached_hotel --> cancelled: cancel
    collection_started --> cancelled: cancel
    collection_completed --> cancelled: cancel
    moving_to_plant --> cancelled: cancel
    reached_plant --> cancelled: cancel
    unloaded --> cancelled: cancel

    closed --> [*]
    cancelled --> [*]

    note right of collection_started
      Driver quantity log is writable
    end note
    note right of collection_completed
      Driver quantity log remains writable
      Hotel confirmation becomes available
    end note
    note right of moving_to_plant
      Driver quantity edits are rejected
    end note
```

The backend is authoritative: the UI hides unavailable actions, but every
transition and quantity write is enforced server-side.

## Role responsibilities

```mermaid
flowchart TB
    subgraph HotelRole[Hotel operator]
        H1[Register and maintain hotel location]
        H2[Create pickup request]
        H3[View own trip status and driver map]
        H4[Confirm collected quantity]
        H5[View invoices]
    end

    subgraph DriverRole[Driver]
        D1[Accept assigned trip]
        D2[Send GPS pings]
        D3[Advance own trip states]
        D4[Use road navigation]
        D5[Record quantity during collection only]
    end

    subgraph AdminRole[Administrator]
        A1[Approve hotels and drivers]
        A2[Approve requests and assign tankers]
        A3[Watch all active vehicles]
        A4[Manage fleet and payments]
        A5[Inspect audit trail and trip history]
    end

    H2 --> A2
    A2 --> D1
    D1 --> D2
    D2 --> D3
    D3 --> D5
    D5 --> H4
    D2 --> H3
    H4 --> A4
    A4 --> H5
```

## Live location and map data flow

```mermaid
flowchart LR
    GPS[Driver device GPS]
    DRIVER[Driver dashboard]
    PING[POST /tracking/trips/:id/ping]
    LOG[(location_logs)]
    VEHICLE[(vehicle last position)]
    HOTEL[Hotel trip map]
    ADMIN[Admin live map]
    TRAIL[GET /tracking/trips/:id]
    LIVE[GET /tracking/live]
    ROUTE[GET /navigation/trips/:id/route]
    MAPBOX[Mapbox route + tiles]

    GPS --> DRIVER
    DRIVER --> PING
    PING --> LOG
    PING --> VEHICLE
    LOG --> TRAIL
    VEHICLE --> LIVE
    TRAIL --> HOTEL
    LIVE --> ADMIN
    DRIVER --> ROUTE
    HOTEL --> ROUTE
    ADMIN --> ROUTE
    ROUTE --> MAPBOX
```

## Deployment boundaries

```mermaid
flowchart LR
    subgraph Deployments[Separate frontend deployments]
        AD[admin-dashboard<br/>port 3000]
        HD[hotel-dashboard<br/>port 3001]
        DD[driver-dashboard<br/>port 3002]
    end

    subgraph BackendDeployment[Separate backend deployment]
        API[FastAPI /api/v1]
        STORE[(Configured database)]
    end

    AD -->|NEXT_PUBLIC_API_BASE| API
    HD -->|NEXT_PUBLIC_API_BASE| API
    DD -->|NEXT_PUBLIC_API_BASE| API
    API --> STORE
```

