"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { Trip } from "../../lib/types";
import ProtectedRoute from "../../components/ProtectedRoute";
import AppShell from "../../components/AppShell";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { AlertCircle, RefreshCw, Eye } from "lucide-react";

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyActive, setOnlyActive] = useState(false);
  const [, startTransition] = useTransition();

  const loadTrips = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.listMyTrips(onlyActive);
      setTrips(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      if (!silent) setError(err.message || "Failed to load trips.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [onlyActive]);

  const columns: Column<Trip>[] = [
    {
      header: "Trip Code",
      accessor: "trip_code",
      className: "font-mono font-bold text-slate-800",
    },
    {
      header: "Status",
      accessor: (item) => <StatusBadge status={item.status as any} />,
    },
    {
      header: "Assigned At",
      accessor: (item) =>
        item.assigned_at ? new Date(item.assigned_at).toLocaleString() : "-",
      className: "font-mono text-slate-600",
    },
    {
      header: "Collected At",
      accessor: (item) =>
        item.collected_at ? new Date(item.collected_at).toLocaleString() : "-",
      className: "font-mono text-slate-600",
    },
    {
      header: "Completed At",
      accessor: (item) =>
        item.completed_at ? new Date(item.completed_at).toLocaleString() : "-",
      className: "font-mono text-slate-600",
    },
    {
      header: "Actions",
      accessor: (item) => (
        <Link
          href={`/trips/${item.id}`}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5"
        >
          <Eye className="h-3.5 w-3.5" />
          View Details
        </Link>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Action Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-150 pb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => startTransition(() => setOnlyActive(!onlyActive))}
                className={`px-4 py-2 border rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  onlyActive
                    ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {onlyActive ? "Showing Active Trips Only" : "Showing All Trips"}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => loadTrips(false)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
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
              <p className="mt-4 text-sm text-gray-500 font-medium">Fetching trip list...</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={trips}
              keyExtractor={(item) => item.id}
              emptyMessage="No trips found."
            />
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
