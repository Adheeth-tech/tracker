"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { PickupRequest } from "../../lib/types";
import ProtectedRoute from "../../components/ProtectedRoute";
import AppShell from "../../components/AppShell";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { AlertCircle, Plus, RefreshCw, Filter } from "lucide-react";

export default function RequestsPage() {
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [, startTransition] = useTransition();

  const loadRequests = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.listMyRequests(statusFilter || undefined);
      setRequests(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      if (!silent) setError(err.message || "Failed to load pickup requests.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const columns: Column<PickupRequest>[] = [
    {
      header: "Request Code",
      accessor: "request_code",
      className: "font-mono font-bold text-slate-800",
    },
    {
      header: "Requested Date",
      accessor: (item) => item.requested_date || "-",
      className: "font-mono text-slate-600",
    },
    {
      header: "Estimated Litres",
      accessor: (item) => (item.estimated_litres ? `${item.estimated_litres.toLocaleString()} L` : "-"),
      className: "font-mono font-semibold text-slate-700",
    },
    {
      header: "Wastewater Type",
      accessor: (item) => (
        <span className="capitalize">{item.wastewater_type.replace("_", " ")}</span>
      ),
      className: "font-semibold text-slate-500",
    },
    {
      header: "Urgency",
      accessor: (item) => (
        <span className={`text-[10px] font-bold uppercase ${
          item.urgency === "urgent" || item.urgency === "high"
            ? "text-red-650"
            : "text-slate-400"
        }`}>
          {item.urgency}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: (item) => <StatusBadge status={item.status as any} />,
    },
  ];

  const filterOptions = [
    { label: "All Statuses", value: "" },
    { label: "Requested", value: "requested" },
    { label: "Approved", value: "approved" },
    { label: "Assigned", value: "assigned" },
    { label: "In Progress", value: "in_progress" },
    { label: "Collected", value: "collected" },
    { label: "Received at Plant", value: "received_at_plant" },
    { label: "Completed", value: "completed" },
    { label: "Paid", value: "paid" },
    { label: "Cancelled", value: "cancelled" },
  ];

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Action Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-150 pb-5">
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => startTransition(() => setStatusFilter(e.target.value))}
                className="text-xs font-semibold bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {filterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => loadRequests(false)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>

              <Link
                href="/requests/new"
                className="inline-flex items-center gap-2 px-4 py-2 border border-transparent rounded-xl text-sm font-bold text-white bg-indigo-650 hover:bg-indigo-750 transition-colors shadow-sm cursor-pointer animate-fade-in"
              >
                <Plus className="h-4 w-4" />
                New Request
              </Link>
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
              <p className="mt-4 text-sm text-gray-500 font-medium">Fetching request list...</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={requests}
              keyExtractor={(item) => item.id}
              emptyMessage="No pickup requests found."
            />
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
