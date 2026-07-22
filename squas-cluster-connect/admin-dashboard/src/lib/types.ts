// Shared types mirroring the backend Pydantic schemas.
// Keep in sync with backend/app/schemas and app/core/enums.py.

export type Role = "hotel" | "driver" | "admin" | "treatment";

export type RequestStatus =
  | "requested" | "approved" | "assigned" | "in_progress" | "collected"
  | "received_at_plant" | "completed" | "invoiced" | "paid" | "cancelled";

export type TripStatus =
  | "assigned" | "driver_started" | "reached_hotel" | "collection_started"
  | "collection_completed" | "moving_to_plant" | "reached_plant"
  | "unloaded" | "closed" | "cancelled";

export type PaymentMode =
  | "cash" | "upi" | "bank_transfer" | "credit" | "monthly_invoice";
export type PaymentStatus = "unpaid" | "partial" | "paid";
export type WastewaterType =
  | "greywater" | "kitchen" | "mixed" | "blackwater" | "other";

export interface Token {
  access_token: string;
  token_type: string;
  role: Role;
  user_id: number;
}

export interface Hotel {
  id: number;
  hotel_name: string;
  contact_person?: string | null;
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  status: "pending" | "active" | "suspended";
}

export interface Vehicle {
  id: number;
  vehicle_number: string;
  capacity_litres: number;
  driver_id?: number | null;
  status: "available" | "on_trip" | "maintenance" | "inactive";
  last_lat?: number | null;
  last_lng?: number | null;
}

export interface PickupRequest {
  id: number;
  request_code: string;
  hotel_id: number;
  requested_date?: string | null;
  time_window?: string | null;
  estimated_litres?: number | null;
  wastewater_type: WastewaterType;
  access_instructions?: string | null;
  remarks?: string | null;
  urgency: "normal" | "urgent" | "high";
  status: RequestStatus;
  hotel?: Hotel | null;
  created_at?: string | null;
}

export interface Payment {
  id: number;
  trip_id: number;
  amount: number;
  payment_mode: PaymentMode;
  payment_status: PaymentStatus;
  transaction_id?: string | null;
  paid_at?: string | null;
  rate_per_litre?: number | null;
  quantity_litres?: number | null;
}

export interface Driver {
  id: number;
  name: string;
  phone: string;
  license_number?: string | null;
  is_active: boolean;
  status: "pending" | "active" | "suspended";
}

export interface Trip {
  id: number;
  trip_code: string;
  request_id: number;
  driver_id: number;
  vehicle_id: number;
  status: TripStatus;
  assigned_at?: string | null;
  accepted_at?: string | null;
  started_at?: string | null;
  arrived_at?: string | null;
  loading_started_at?: string | null;
  collected_at?: string | null;
  delivery_started_at?: string | null;
  completed_at?: string | null;
  request?: PickupRequest | null;
  vehicle?: Vehicle | null;
  payment?: Payment | null;
  quantity?: {
    id: number;
    trip_id: number;
    collected_litres?: number | null;
    driver_entered_litres?: number | null;
  } | null;
}

export interface VehiclePosition {
  vehicle_id: number;
  vehicle_number: string;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
  trip_id?: number | null;
}

export interface Dashboard {
  today: { date: string; total_litres: number; trips_completed: number; revenue: number };
  fleet: { active_trips: number; pending_payment_amount: number };
  hotels: { hotel_id: number; hotel_name: string; trips: number; total_litres: number }[];
}
