"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { Trip } from "../../lib/types";
import ProtectedRoute from "../../components/ProtectedRoute";
import AppShell from "../../components/AppShell";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { AlertCircle, RefreshCw, PlayCircle, Check, X } from "lucide-react";

export default function JobsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.listMyTrips(false); // fetch all active + completed
      setTrips(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      if (!silent) setError(err.message || "Failed to load jobs.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleAccept = async (tripId: number) => {
    setActionLoading(true);
    try {
      await api.acceptTrip(tripId);
      await loadJobs(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to accept trip assignment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (tripId: number) => {
    if (!confirm("Are you sure you want to decline this job offer?")) return;
    setActionLoading(true);
    try {
      await api.declineTrip(tripId);
      await loadJobs(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to decline trip assignment.");
    } finally {
      setActionLoading(false);
    }
  };

  // Split trips into proposed, active, and completed
  const proposedTrips = trips.filter(
    (t) => t.status === "assigned" && !t.accepted_at
  );
  const activeTrips = trips.filter(
    (t) => t.status !== "closed" && t.status !== "cancelled" && !(t.status === "assigned" && !t.accepted_at)
  );
  const completedTrips = trips.filter(
    (t) => t.status === "closed"
  );

  const proposedColumns: Column<Trip>[] = [
    {
      header: "Job Code",
      accessor: "trip_code",
      className: "font-mono font-bold text-slate-800",
    },
    {
      header: "Assigned At",
      accessor: (item) =>
        item.assigned_at ? new Date(item.assigned_at).toLocaleString() : "-",
      className: "font-mono text-slate-650",
    },
    {
      header: "Tanker ID",
      accessor: (item) => `Vehicle #${item.vehicle_id}`,
      className: "font-mono font-semibold text-slate-700",
    },
    {
      header: "Actions",
      accessor: (item) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleAccept(item.id)}
            disabled={actionLoading}
            className="text-xs font-bold text-emerald-700 hover:text-white bg-emerald-50 hover:bg-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Accept
          </button>
          <button
            onClick={() => handleDecline(item.id)}
            disabled={actionLoading}
            className="text-xs font-bold text-red-700 hover:text-white bg-red-50 hover:bg-red-650 px-3 py-1.5 rounded-lg border border-red-200 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Decline
          </button>
        </div>
      ),
    },
  ];

  const activeColumns: Column<Trip>[] = [
    {
      header: "Job Code",
      accessor: "trip_code",
      className: "font-mono font-bold text-slate-800",
    },
    {
      header: "Status",
      accessor: (item) => <StatusBadge status={item.status as any} />,
    },
    {
      header: "Vehicle ID",
      accessor: (item) => `Vehicle #${item.vehicle_id}`,
      className: "font-mono font-semibold text-slate-700",
    },
    {
      header: "Actions",
      accessor: (item) => (
        <Link
          href={`/jobs/${item.id}`}
          className="text-xs font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-650 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          <PlayCircle className="h-3.5 w-3.5" />
          Run Job
        </Link>
      ),
    },
  ];

  const completedColumns: Column<Trip>[] = [
    {
      header: "Job Code",
      accessor: "trip_code",
      className: "font-mono font-bold text-slate-800",
    },
    {
      header: "Completed At",
      accessor: (item) =>
        item.completed_at ? new Date(item.completed_at).toLocaleString() : "-",
      className: "font-mono text-slate-650",
    },
    {
      header: "Volume Logged",
      accessor: (item) =>
        item.quantity?.collected_litres
          ? `${item.quantity.collected_litres.toLocaleString()} L`
          : "-",
      className: "font-mono font-bold text-slate-700",
    },
    {
      header: "Payment Method",
      accessor: (item) =>
        item.payment?.payment_mode
          ? item.payment.payment_mode.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
          : "Not Paid",
      className: "capitalize text-slate-700 font-semibold",
    },
    {
      header: "Amount Collected",
      accessor: (item) =>
        item.payment?.amount ? `₹${item.payment.amount.toLocaleString()}` : "-",
      className: "font-mono font-bold text-slate-900",
    },
    {
      header: "Payment Status",
      accessor: (item) => (
        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
          item.payment?.payment_status === "paid"
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-amber-50 text-amber-700 border border-amber-200"
        }`}>
          {item.payment?.payment_status || "Unpaid"}
        </span>
      ),
    },
    {
      header: "Transaction Ref ID",
      accessor: (item) => item.payment?.transaction_id || "-",
      className: "font-mono text-slate-500 text-xs",
    },
    {
      header: "Actions",
      accessor: (item) => (
        <Link
          href={`/jobs/${item.id}`}
          className="text-xs font-bold text-slate-600 hover:text-white bg-slate-50 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          View details
        </Link>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-8">
          {/* Action Row */}
          <div className="flex justify-between items-center border-b border-gray-150 pb-5">
            <div>
              <p className="text-xs text-gray-400 font-medium">Currently assigned dispatch tasks and tanker operations</p>
            </div>
            <button
              onClick={() => loadJobs(false)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh list
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-semibold flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-150 rounded-2xl shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-650"></div>
              <p className="mt-4 text-sm text-gray-500 font-medium">Fetching job tickets...</p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Proposed Assignments Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  New Job Assignments Awaiting Acceptance ({proposedTrips.length})
                </h4>
                <DataTable
                  columns={proposedColumns}
                  data={proposedTrips}
                  keyExtractor={(item) => item.id}
                  emptyMessage="No new job offers awaiting acceptance."
                />
              </div>

              {/* Active Duty Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Active Dispatch Duty ({activeTrips.length})
                </h4>
                <DataTable
                  columns={activeColumns}
                  data={activeTrips}
                  keyExtractor={(item) => item.id}
                  emptyMessage="No active running jobs right now."
                />
              </div>

              {/* Completed Dispatch History & Payments Section */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Completed Dispatch History & Payments ({completedTrips.length})
                </h4>
                <DataTable
                  columns={completedColumns}
                  data={completedTrips}
                  keyExtractor={(item) => item.id}
                  emptyMessage="No completed jobs found."
                />
              </div>

            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
