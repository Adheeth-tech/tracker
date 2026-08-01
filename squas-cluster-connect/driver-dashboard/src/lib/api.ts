import type {
  Driver,
  Token, Trip, Payment, Notification, NavigationRoute
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

const TOKEN_KEY = "squas_driver_token";

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
  me: () => req<{ id: number; role: string; name?: string | null; phone?: string | null; driver_id?: number | null }>("/auth/me"),

  registerDriver: (payload: { name: string; phone: string; license_number?: string }) =>
    req<any>("/fleet/drivers/register", "POST", payload),

  getDriver: (id: number) => req<Driver>(`/fleet/drivers/${id}`),

  // ---- trips ----
  listMyTrips: (onlyActive = false) =>
    req<Trip[]>(`/trips${onlyActive ? "?only_active=true" : ""}`),

  getTrip: (id: number) => req<Trip>(`/trips/${id}`),

  getNextStates: (id: number) =>
    req<{ current: string; allowed: string[] }>(`/trips/${id}/next-states`),

  advanceTrip: (
    id: number,
    target: string,
    location?: { latitude: number; longitude: number; speed?: number | null }
  ) => req<Trip>(`/trips/${id}/advance`, "POST", { target, location }),

  acceptTrip: (id: number) => req<Trip>(`/trips/${id}/accept`, "POST"),

  declineTrip: (id: number) => req<Trip>(`/trips/${id}/decline`, "POST"),

  recordQuantity: (
    id: number,
    driverEnteredLitres: number,
    source = "manual",
    proofPhotoUrl?: string
  ) =>
    req<any>(`/trips/${id}/quantity`, "POST", {
      driver_entered_litres: driverEnteredLitres,
      source,
      proof_photo_url: proofPhotoUrl,
    }),

  // ---- billing ----
  getPayment: (tripId: number) => req<Payment>(`/payments/trip/${tripId}`),
  updatePayment: (tripId: number, opts: { payment_mode: string; payment_status: string; transaction_id?: string; rate_per_litre?: number }) =>
    req<any>(`/payments/trip/${tripId}`, "POST", opts),

  pingLocation: (tripId: number, latitude: number, longitude: number, speed?: number | null) =>
    req<void>(`/tracking/trips/${tripId}/ping`, "POST", { latitude, longitude, speed }),

  getNavigationRoute: (tripId: number, latitude: number, longitude: number) =>
    req<NavigationRoute>(
      `/navigation/trips/${tripId}/route?origin_lat=${encodeURIComponent(latitude)}&origin_lng=${encodeURIComponent(longitude)}`
    ),

  // ---- notifications ----
  listNotifications: (unreadOnly = false) =>
    req<Notification[]>(`/notifications${unreadOnly ? "?unread_only=true" : ""}`),
};
