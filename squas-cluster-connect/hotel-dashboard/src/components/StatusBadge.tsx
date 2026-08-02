import React from "react";
import { RequestStatus, TripStatus, PaymentStatus } from "../lib/types";

type StatusType =
  | RequestStatus
  | TripStatus
  | PaymentStatus
  | "pending"
  | "active"
  | "suspended"
  | "draft"
  | "sent"
  | "paid"
  | "overdue";

interface StatusBadgeProps {
  status: StatusType;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  let colorClasses = "bg-gray-100 text-gray-800 border-gray-200";

  switch (status?.toLowerCase()) {
    // Green (success/completed/approved/active/paid)
    case "approved":
    case "completed":
    case "paid":
    case "active":
    case "closed":
    case "unloaded":
    case "received_at_plant":
      colorClasses = "bg-green-50 text-green-700 border-green-200";
      break;

    // Blue (in progress/active actions/on trip/sent)
    case "in_progress":
    case "driver_started":
    case "reached_hotel":
    case "collection_started":
    case "collection_completed":
    case "moving_to_plant":
    case "reached_plant":
    case "sent":
      colorClasses = "bg-blue-50 text-blue-700 border-blue-200";
      break;

    // Orange/Yellow (pending/upcoming/requested/draft)
    case "requested":
    case "assigned":
    case "unpaid":
    case "pending":
    case "draft":
    case "partial":
      colorClasses = "bg-yellow-50 text-yellow-700 border-yellow-200";
      break;

    // Red (negative/cancelled/suspended/overdue)
    case "cancelled":
    case "suspended":
    case "overdue":
      colorClasses = "bg-red-50 text-red-700 border-red-200";
      break;

    default:
      colorClasses = "bg-gray-50 text-gray-600 border-gray-200";
      break;
  }

  let label = status ? String(status) : "Unknown";
  const statusClean = label.toLowerCase();
  if (statusClean === "driver_started") {
    label = "Driver En Route";
  } else if (statusClean === "reached_hotel") {
    label = "Driver Arrived";
  } else if (statusClean === "collection_started") {
    label = "Loading Started";
  } else if (statusClean === "collection_completed") {
    label = "Loading Completed";
  } else if (statusClean === "moving_to_plant") {
    label = "Delivery Started";
  } else if (statusClean === "reached_plant") {
    label = "Reached Destination";
  } else if (statusClean === "closed") {
    label = "Delivery Completed";
  } else {
    label = label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border ${colorClasses}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {label}
    </span>
  );
}
