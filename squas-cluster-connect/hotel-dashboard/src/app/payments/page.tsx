"use client";

import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Invoice } from "../../lib/types";
import ProtectedRoute from "../../components/ProtectedRoute";
import AppShell from "../../components/AppShell";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function PaymentsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInvoices = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.listMyInvoices();
      setInvoices(data);
      setError(null);
    } catch (err: any) {
      console.error(err);
      if (!silent) setError(err.message || "Failed to load invoices.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const columns: Column<Invoice>[] = [
    {
      header: "Invoice Code",
      accessor: "invoice_code",
      className: "font-mono font-bold text-slate-800",
    },
    {
      header: "Billing Period",
      accessor: (item) => `${item.period_start} to ${item.period_end}`,
      className: "font-mono text-slate-650",
    },
    {
      header: "Total Trips",
      accessor: (item) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
          {item.total_trips}
        </span>
      ),
    },
    {
      header: "Total Litres",
      accessor: (item) => `${item.total_litres.toLocaleString()} L`,
      className: "font-mono font-semibold text-slate-600",
    },
    {
      header: "Total Amount",
      accessor: (item) => `₹${item.total_amount.toLocaleString()}`,
      className: "font-mono font-bold text-indigo-650",
    },
    {
      header: "Status",
      accessor: (item) => <StatusBadge status={item.status as any} />,
    },
  ];

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Action Row */}
          <div className="flex justify-end items-center border-b border-gray-150 pb-5">
            <button
              onClick={() => loadInvoices(false)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Now
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
              <p className="mt-4 text-sm text-gray-500 font-medium">Fetching invoice ledger...</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={invoices}
              keyExtractor={(item) => item.id}
              emptyMessage="No invoices generated yet."
            />
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
