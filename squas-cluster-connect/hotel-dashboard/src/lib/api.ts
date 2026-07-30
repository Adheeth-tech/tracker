import type {
  Token, Hotel, PickupRequest, Trip, Payment, Invoice, Notification
} from "./types";

const getApiBase = () => {
  let base = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api/v1";
  base = base.replace(/\/$/, "");
  if (!base.endsWith("/api/v1")) {
    base = `${base}/api/v1`;
  }
  return base;
};

const BASE = getApiBase();

const TOKEN_KEY = "squas_hotel_token";

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
  method: "GET" | "POST" = "GET",
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
  me: () => req<{ id: number; role: string; name?: string | null; phone?: string | null; hotel_id?: number | null }>("/auth/me"),

  // ---- hotel profile & registration ----
  registerHotel: (payload: {
    hotel_name: string;
    contact_person?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    gst_number?: string | null;
    tank_location?: string | null;
    tank_capacity?: number | null;
    usual_volume?: number | null;
    usual_pickup_time?: string | null;
    payment_type?: string | null;
  }) => req<Hotel>("/hotels", "POST", payload),

  getMyHotel: (id: number) => req<Hotel>(`/hotels/${id}`),

  // ---- requests ----
  listMyRequests: (statusFilter?: string) =>
    req<PickupRequest[]>(`/requests${statusFilter ? `?status_filter=${statusFilter}` : ""}`),

  createRequest: (payload: {
    requested_date?: string | null;
    time_window?: string | null;
    estimated_litres?: number | null;
    wastewater_type: string;
    access_instructions?: string | null;
    remarks?: string | null;
    urgency?: string | null;
  }) => req<PickupRequest>("/requests", "POST", payload),

  // ---- trips & tracking ----
  listMyTrips: (onlyActive = false) =>
    req<Trip[]>(`/trips${onlyActive ? "?only_active=true" : ""}`),

  getTrip: (id: number) => req<Trip>(`/trips/${id}`),

  getTripTrail: (id: number) =>
    req<{ lat: number; lng: number; speed?: number | null; status: string; ts: string }[]>(`/tracking/trips/${id}`),

  confirmQuantity: (tripId: number, hotelConfirmedLitres: number, remarks?: string) =>
    req<any>(`/trips/${tripId}/quantity`, "POST", {
      hotel_confirmed_litres: hotelConfirmedLitres,
      variance_remarks: remarks,
    }),

  getQuantity: (tripId: number) =>
    req<any>(`/trips/${tripId}/quantity`, "POST", {}),

  // ---- payments & invoices ----
  getPayment: (tripId: number) => req<Payment>(`/payments/trip/${tripId}`),

  listMyInvoices: () => req<Invoice[]>("/payments/invoices"),

  // ---- notifications ----
  listNotifications: (unreadOnly = false) =>
    req<Notification[]>(`/notifications${unreadOnly ? "?unread_only=true" : ""}`),
};
