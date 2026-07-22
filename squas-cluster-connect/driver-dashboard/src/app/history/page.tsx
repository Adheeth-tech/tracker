"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { Trip } from "../../lib/types";
import ProtectedRoute from "../../components/ProtectedRoute";
import AppShell from "../../components/AppShell";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { AlertCircle, RefreshCw, Eye } from "lucide-react";

export default function HistoryPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.listMyTrips(false); // get all
      // Filter for closed or cancelled
      const filtered = data.filter((t) => ["closed", "cancelled"].includes(t.status));
      setTrips(filtered);
      setError(null);
    } catch (err: any) {
      console.error(err);
      if (!silent) setError(err.message || "Failed to load job history.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const columns: Column<Trip>[] = [
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
      header: "Assigned At",
      accessor: (item) =>
        item.assigned_at ? new Date(item.assigned_at).toLocaleString() : "-",
      className: "font-mono text-slate-600",
    },
    {
      header: "Completed At",
      accessor: (item) =>
        item.completed_at ? new Date(item.completed_at).toLocaleString() : "-",
      className: "font-mono text-slate-650",
    },
    {
      header: "Actions",
      accessor: (item) => (
        <Link
          href={`/jobs/${item.id}`}
          className="text-xs font-bold text-slate-500 hover:text-indigo-650 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer"
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
          <div className="flex justify-between items-center border-b border-gray-150 pb-5">
            <div>
              <p className="text-xs text-gray-400 font-medium">Historical completed or cancelled dispatch jobs</p>
            </div>
            <button
              onClick={() => loadHistory(false)}
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
              <p className="mt-4 text-sm text-gray-500 font-medium">Loading history records...</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={trips}
              keyExtractor={(item) => item.id}
              emptyMessage="No historical jobs found."
            />
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
