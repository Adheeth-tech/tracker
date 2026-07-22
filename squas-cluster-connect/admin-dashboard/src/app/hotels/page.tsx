"use client";

import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Hotel } from "../../lib/types";
import ProtectedRoute from "../../components/ProtectedRoute";
import AppShell from "../../components/AppShell";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react";

export default function HotelsPage() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      const data = await api.listHotels();
      setHotels(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load hotels list.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  const handleApprove = async (id: number) => {
    setError(null);
    setActionLoadingId(id);
    try {
      await api.approveHotel(id);
      // Refresh the hotel list
      const updatedHotels = await api.listHotels();
      setHotels(updatedHotels);
    } catch (err: any) {
      console.error(err);
      setError(err.message || `Failed to approve hotel with ID ${id}.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns: Column<Hotel>[] = [
    {
      header: "ID",
      accessor: "id",
      className: "text-slate-500 font-mono text-xs w-16",
    },
    {
      header: "Hotel Name",
      accessor: "hotel_name",
      className: "font-bold text-slate-805",
    },
    {
      header: "Contact Person",
      accessor: (item) => item.contact_person || "-",
    },
    {
      header: "Phone",
      accessor: (item) => item.phone || "-",
      className: "font-mono text-slate-600",
    },
    {
      header: "Status",
      accessor: (item) => <StatusBadge status={item.status} />,
    },
    {
      header: "Actions",
      accessor: (item) => {
        if (item.status === "pending") {
          return (
            <button
              onClick={() => handleApprove(item.id)}
              disabled={actionLoadingId === item.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {actionLoadingId === item.id ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5" />
              )}
              Approve
            </button>
          );
        }
        return <span className="text-xs text-gray-400 font-medium">No actions available</span>;
      },
    },
  ];

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-400 font-medium">Verify and manage hotel registrations</p>
            </div>
            <button
              onClick={fetchHotels}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-semibold flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {loading && hotels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-150 rounded-2xl shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-sm text-gray-500 font-medium">Loading hotel registry...</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={hotels}
              keyExtractor={(item) => item.id}
              emptyMessage="No registered hotels found."
            />
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
