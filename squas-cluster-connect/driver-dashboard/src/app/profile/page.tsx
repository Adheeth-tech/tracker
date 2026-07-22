"use client";

import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import ProtectedRoute from "../../components/ProtectedRoute";
import AppShell from "../../components/AppShell";
import StatusBadge from "../../components/StatusBadge";
import { User, Phone, CheckCircle, ShieldAlert, Truck, AlertTriangle } from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<{ id: number; role: string; driver_id?: number | null } | null>(null);
  const [driverDetail, setDriverDetail] = useState<any | null>(null);
  const [activeVehicle, setActiveVehicle] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const me = await api.me();
        setProfile(me);

        if (me.driver_id) {
          const detail = await api.getDriver(me.driver_id);
          setDriverDetail(detail);
        }

        // Derive active vehicle from driver's active trips
        const trips = await api.listMyTrips(true);
        if (trips.length > 0) {
          setActiveVehicle(trips[0].vehicle_id);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-150 rounded-2xl shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-650"></div>
              <p className="mt-4 text-sm text-gray-500 font-medium">Fetching profile...</p>
            </div>
          ) : (
            profile && (
              <div className="space-y-6">
                {driverDetail?.status === "pending" && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-xs font-semibold flex items-start gap-2.5 leading-relaxed">
                    <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-950 text-sm">Awaiting Approval</p>
                      <p className="mt-1 text-amber-800">Your registration is awaiting admin approval. You'll be assignable to jobs once approved.</p>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-gray-150 rounded-2xl p-8 shadow-sm space-y-6">
                  
                  {/* Avatar Banner */}
                  <div className="flex items-center gap-5 border-b border-gray-100 pb-6">
                    <div className="h-16 w-16 bg-slate-900 text-white rounded-full flex items-center justify-center text-xl font-bold">
                      {(driverDetail?.name || (profile as any).name || "D").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">{driverDetail?.name || (profile as any).name || "Driver Account"}</h3>
                      <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Authenticated & Active</span>
                      </div>
                    </div>
                  </div>

                  {/* Profile Fields */}
                  <div className="space-y-4 text-xs font-semibold">
                    {driverDetail && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-400 flex items-center gap-1.5">
                          <User className="h-4 w-4 text-slate-400" />
                          Driver Name:
                        </span>
                        <span className="text-slate-900 font-bold">{driverDetail.name}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-slate-400" />
                        Phone Number:
                      </span>
                      <span className="font-mono text-slate-900 font-bold">{(profile as any).phone || "-"}</span>
                    </div>

                    {driverDetail?.license_number && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-400 flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4 text-slate-400" />
                          License Number:
                        </span>
                        <span className="font-mono text-slate-900 font-bold">{driverDetail.license_number}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <User className="h-4 w-4 text-slate-400" />
                        Driver Reference ID:
                      </span>
                      <span className="font-mono text-slate-900 font-bold">#{profile.driver_id || "-"}</span>
                    </div>

                    {driverDetail && (
                      <div className="flex items-center justify-between py-2 border-b border-gray-50">
                        <span className="text-gray-400 flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4 text-slate-400" />
                          Registration Status:
                        </span>
                        <StatusBadge status={driverDetail.status} />
                      </div>
                    )}

                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4 text-slate-400" />
                        Portal Role:
                      </span>
                      <span className="text-indigo-650 capitalize font-bold">{profile.role}</span>
                    </div>

                    <div className="flex items-center justify-between py-2 border-b border-gray-50">
                      <span className="text-gray-400 flex items-center gap-1.5">
                        <Truck className="h-4 w-4 text-slate-400" />
                        Active Assigned Vehicle:
                      </span>
                      <span className="font-mono text-slate-800 font-bold">
                        {activeVehicle ? `Vehicle #${activeVehicle}` : "No Active Duty Assignment"}
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            )
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
