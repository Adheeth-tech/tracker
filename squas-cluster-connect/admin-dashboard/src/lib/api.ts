// Typed API client for the Squas Cluster Connect backend.
// Usage:
//   await api.requestOtp("+919000000001");
//   await api.verifyOtp("+919000000001", "123456"); // stores token
//   const dash = await api.dashboard();

import type {
  Dashboard, Hotel, PaymentMode, PaymentStatus, PickupRequest,
  Token, Trip, TripStatus, Vehicle, VehiclePosition, Driver
} from "./types";

const BASE =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api/v1";

const TOKEN_KEY = "squas_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function setToken(t: string | null) {
  if (typeof window === "undefined") return;
  if (t) window.localStorage.setItem(TOKEN_KEY, t);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function req<T>(
  path: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // ---- auth ----
  requestOtp: (phone: string) =>
    req<{ detail: string; dev_otp?: string }>("/auth/otp/request", "POST", { phone }),

  async verifyOtp(phone: string, code: string): Promise<Token> {
    const tok = await req<Token>("/auth/otp/verify", "POST", { phone, code });
    setToken(tok.access_token);
    return tok;
  },

  logout: () => setToken(null),
  me: () => req<{ id: number; role: string; name?: string | null; phone?: string | null }>("/auth/me"),

  // ---- hotels ----
  listHotels: () => req<Hotel[]>("/hotels"),
  approveHotel: (id: number) => req<Hotel>(`/hotels/${id}/approve`, "POST"),

  // ---- fleet ----
  listVehicles: () => req<Vehicle[]>("/fleet/vehicles"),
  createVehicle: (opts: { vehicle_number: string; capacity_litres: number; driver_id?: number | null }) =>
    req<Vehicle>("/fleet/vehicles", "POST", opts),
  listDrivers: () => req<Driver[]>("/fleet/drivers"),
  createDriver: (opts: { name: string; phone: string; license_number?: string }) =>
    req<Driver>("/fleet/drivers", "POST", opts),
  approveDriver: (id: number) => req<Driver>(`/fleet/drivers/${id}/approve`, "POST"),

  // ---- requests ----
  listRequests: (status?: string) =>
    req<PickupRequest[]>(`/requests${status ? `?status_filter=${status}` : ""}`),
  approveRequest: (id: number) => req<PickupRequest>(`/requests/${id}/approve`, "POST"),
  assignRequest: (id: number, opts: { vehicle_id?: number; driver_id?: number; auto?: boolean }) =>
    req<Trip>(`/requests/${id}/assign`, "POST", opts),

  // ---- trips ----
  listTrips: (onlyActive = false) =>
    req<Trip[]>(`/trips${onlyActive ? "?only_active=true" : ""}`),
  getTrip: (id: number) => req<Trip>(`/trips/${id}`),
  deleteTrip: (id: number) => req<void>(`/trips/${id}`, "DELETE"),
  advanceTrip: (id: number, target: TripStatus, location?: { latitude: number; longitude: number }) =>
    req<Trip>(`/trips/${id}/advance`, "POST", { target, location }),
  nextStates: (id: number) =>
    req<{ current: string; allowed: string[] }>(`/trips/${id}/next-states`),
  recordQuantity: (id: number, opts: { driver_entered_litres?: number; collected_litres?: number; hotel_confirmed_litres?: number; variance_remarks?: string }) =>
    req<any>(`/trips/${id}/quantity`, "POST", opts),
  getQuantity: (id: number) =>
    req<any>(`/trips/${id}/quantity`, "POST", {}),

  // ---- tracking ----
  liveMap: () => req<VehiclePosition[]>("/tracking/live"),
  tripTrail: (id: number) =>
    req<{ lat: number; lng: number; status: string; ts: string }[]>(`/tracking/trips/${id}`),

  // ---- payments ----
  pendingPayments: () => req<unknown[]>("/payments/pending"),
  updatePayment: (tripId: number, mode: PaymentMode, status: PaymentStatus, txn?: string) =>
    req<unknown>(`/payments/trip/${tripId}`, "POST",
      { payment_mode: mode, payment_status: status, transaction_id: txn }),
  generateInvoice: (hotel_id: number, period_start: string, period_end: string) =>
    req<unknown>("/payments/invoices/generate", "POST", { hotel_id, period_start, period_end }),

  // ---- reports ----
  dashboard: () => req<Dashboard>("/dashboard"),
  dailyReport: (day?: string) => req<unknown>(`/reports/daily${day ? `?day=${day}` : ""}`),
};
