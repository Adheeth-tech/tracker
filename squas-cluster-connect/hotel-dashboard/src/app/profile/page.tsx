"use client";

import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Hotel } from "../../lib/types";
import ProtectedRoute from "../../components/ProtectedRoute";
import AppShell from "../../components/AppShell";
import StatusBadge from "../../components/StatusBadge";
import { AlertTriangle, MapPin, Building, Truck, Wallet, FileText } from "lucide-react";

export default function ProfilePage() {
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        const me = await api.me();
        if (me && me.hotel_id) {
          const data = await api.getMyHotel(me.hotel_id);
          setHotel(data);
        } else {
          setError("No associated hotel profile found for this user.");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load hotel profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-150 rounded-2xl shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-650"></div>
              <p className="mt-4 text-sm text-gray-500 font-medium animate-pulse">Retrieving hotel profile...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-semibold flex items-center gap-3">
              <span className="h-2 w-2 bg-red-500 rounded-full animate-ping"></span>
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && hotel && (
            <div className="space-y-6">
              
              {/* Approval status banner */}
              {hotel.status === "pending" && (
                <div className="bg-amber-50 border border-amber-250 text-amber-805 p-5 rounded-2xl flex items-start gap-4 shadow-sm">
                  <div className="p-2 bg-amber-550 rounded-xl text-white shadow-sm shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-amber-900">Enrollment Approval Pending</h4>
                    <p className="text-xs text-amber-700 leading-relaxed font-medium">
                      Your hotel profile is currently awaiting administrator review. 
                      You can prepare and schedule pickup requests, but drivers cannot be assigned until approval is verified.
                    </p>
                  </div>
                </div>
              )}

              {/* Grid cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Profile overview card */}
                <div className="md:col-span-2 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex justify-between items-start border-b border-gray-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-50 text-indigo-650 rounded-xl">
                        <Building className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-md font-bold text-slate-800">{hotel.hotel_name}</h3>
                        <p className="text-xs text-gray-400 font-semibold mt-0.5">GSTN: <span className="font-mono text-slate-650">{hotel.gst_number || "Not provided"}</span></p>
                      </div>
                    </div>
                    <StatusBadge status={hotel.status as any} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Contact Person</span>
                      <p className="font-bold text-slate-850 text-sm">{hotel.contact_person || "-"}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Phone Number</span>
                      <p className="font-mono font-bold text-slate-800 text-sm">{hotel.phone || "-"}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Email Address</span>
                      <p className="font-bold text-slate-850 text-sm">{hotel.email || "-"}</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Physical Address</span>
                      <p className="font-semibold text-slate-600 leading-normal">{hotel.address || "-"}</p>
                    </div>
                  </div>
                </div>

                {/* Coordinates & location card */}
                <div className="md:col-span-1 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
                  <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                    <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Dispatch Location</h4>
                      <p className="text-xs text-gray-400 font-semibold mt-0.5">Physical GPS markers</p>
                    </div>
                  </div>

                  <div className="space-y-4 flex-1 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Coordinates</span>
                      <p className="font-mono font-bold text-slate-850 text-sm">
                        {hotel.latitude?.toFixed(6)}, {hotel.longitude?.toFixed(6)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tank Location</span>
                      <p className="font-semibold text-slate-600 leading-relaxed">
                        {hotel.tank_location || "Not described"}
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Logistics & billing metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Tank specs */}
                <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Truck className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tank Specification</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-800 font-mono">
                      {hotel.tank_capacity?.toLocaleString()} <span className="text-xs font-semibold text-gray-400">Litres</span>
                    </h3>
                    <p className="text-[10px] text-gray-400 font-semibold mt-1">Total physical tank volume capacity</p>
                  </div>
                </div>

                {/* Volumes */}
                <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-650 rounded-lg">
                      <FileText className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Estimated Volume</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-800 font-mono">
                      {hotel.usual_volume?.toLocaleString()} <span className="text-xs font-semibold text-gray-400">Litres</span>
                    </h3>
                    <p className="text-[10px] text-gray-400 font-semibold mt-1">Average generation per pickup cycle</p>
                  </div>
                </div>

                {/* Time & Billing */}
                <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                      <Wallet className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Billing Terms</span>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-slate-700 capitalize">
                      {hotel.payment_type?.replace("_", " ")}
                    </p>
                    <p className="text-[10px] text-gray-400 font-semibold">
                      Preferred Window: <span className="font-mono text-slate-700 font-bold">{hotel.usual_pickup_time}</span>
                    </p>
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
