"""Squas Cluster Connect — FastAPI application entrypoint.

Wastewater collection, tracking & compliance platform backend.
Wires the module routers (spec section 4) behind a single /api/v1 prefix.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.api.routers import (
    auth,
    fleet,
    hotels,
    payments,
    reports,
    requests,
    tracking,
    treatment,
    trips,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # For local/dev convenience. In production, run Alembic migrations instead.
    init_db()
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Wastewater collection, tracking & compliance platform (backend framework).",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for production
    allow_methods=["*"],
    allow_headers=["*"],
)

API = "/api/v1"
for r in (auth, hotels, fleet, requests, trips, tracking, payments, treatment, reports):
    app.include_router(r.router, prefix=API)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "app": settings.app_name, "env": settings.env}


@app.get("/", tags=["meta"])
def root():
    return {
        "app": settings.app_name,
        "docs": "/docs",
        "api_base": API,
        "modules": [
            "auth", "hotels", "fleet", "requests", "trips",
            "tracking", "payments", "treatment", "reports",
        ],
    }
