"use client";

import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Dashboard } from "../../lib/types";
import ProtectedRoute from "../../components/ProtectedRoute";
import DataTable, { Column } from "../../components/DataTable";
import { Droplet, Award, DollarSign, Activity, AlertCircle, TrendingUp } from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const dash = await api.dashboard();
        setData(dash);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load dashboard metrics.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const columns: Column<any>[] = [
    {
      header: "Hotel Name",
      accessor: "hotel_name",
      className: "font-semibold text-slate-800",
    },
    {
      header: "Total Trips",
      accessor: (item) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
          {item.trips}
        </span>
      ),
    },
    {
      header: "Litres Collected",
      accessor: (item) => `${item.total_litres.toLocaleString()} L`,
      className: "font-mono font-semibold text-indigo-650",
    },
  ];

  return (
    <ProtectedRoute>
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-sm text-gray-500 font-medium">Fetching dashboard statistics...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-semibold flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-8">
            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-5">
              
              {/* Today Litres */}
              <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Litres Today</span>
                  <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Droplet className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-black text-slate-900 font-mono">
                    {data.today.total_litres.toLocaleString()} <span className="text-xs font-semibold text-gray-400">L</span>
                  </h3>
                  <p className="text-[10px] text-gray-400 font-medium mt-1">Today's collection volume</p>
                </div>
              </div>

              {/* Today Trips Completed */}
              <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Trips Completed</span>
                  <div className="p-2 bg-green-50 rounded-lg text-green-600">
                    <Award className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-black text-slate-900 font-mono">
                    {data.today.trips_completed}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-medium mt-1">Trips closed today</p>
                </div>
              </div>

              {/* Today Revenue */}
              <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Revenue Today</span>
                  <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-black text-slate-900 font-mono">
                    ₹{data.today.revenue.toLocaleString()}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-medium mt-1">Invoiced amount today</p>
                </div>
              </div>

              {/* Active Trips */}
              <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Trips</span>
                  <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <Activity className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-black text-slate-900 font-mono">
                    {data.fleet.active_trips}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-medium mt-1">Tankers currently on road</p>
                </div>
              </div>

              {/* Pending Payment Amount */}
              <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Payments</span>
                  <div className="p-2 bg-yellow-50 rounded-lg text-yellow-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-2xl font-black text-slate-900 font-mono">
                    ₹{data.fleet.pending_payment_amount.toLocaleString()}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-medium mt-1">Outstanding receivables</p>
                </div>
              </div>

            </div>

            {/* Hotel Wise Summary */}
            <div className="bg-white p-6 border border-gray-150 rounded-2xl shadow-sm">
              <div className="mb-5">
                <h3 className="text-md font-bold text-slate-800">Hotel-wise Collections Summary</h3>
                <p className="text-xs text-gray-400 mt-1">Overview of trips and total wastewater volumes cleared per hotel</p>
              </div>

              <DataTable
                columns={columns}
                data={data.hotels}
                keyExtractor={(item) => item.hotel_id}
                emptyMessage="No hotel transactions available."
              />
            </div>
          </div>
        )}
    </ProtectedRoute>
  );
}
