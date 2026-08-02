"use client";

import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { PickupRequest, Hotel, Vehicle, RequestStatus, Driver, Trip } from "../../lib/types";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useToast } from "../../components/Toast";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { AlertCircle, CheckCircle, UserPlus, RefreshCw, Layers } from "lucide-react";

export default function RequestsPage() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assignment Modal State
  const [selectedReq, setSelectedReq] = useState<PickupRequest | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [autoAssign, setAutoAssign] = useState(true);
  const [selectedVehId, setSelectedVehId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [reqData, hotData, vehData, drvData, tripData] = await Promise.all([
        api.listRequests(statusFilter || undefined),
        api.listHotels(),
        api.listVehicles(),
        api.listDrivers(),
        api.listTrips(),
      ]);

      setRequests(reqData);
      setHotels(hotData);
      setVehicles(vehData);
      setDrivers(drvData);
      setTrips(tripData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load requests data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleApprove = async (id: number) => {
    setError(null);
    setActionLoadingId(id);
    try {
      await api.approveRequest(id);
      showToast("Pickup request approved.", "success");
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || `Failed to approve request ${id}.`, "error");
      setError(err.message || `Failed to approve request ${id}.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq) return;

    setError(null);
    setSubmitting(true);
    try {
      const assignment = autoAssign
        ? { auto: true }
        : (() => {
            const vehicle = vehicles.find((v) => v.id === parseInt(selectedVehId));
            if (!vehicle) throw new Error("Please select a valid vehicle");
            return { vehicle_id: vehicle.id, driver_id: vehicle.driver_id || undefined };
          })();

      if (selectedTrip) {
        await api.reassignRequest(selectedReq.id, assignment);
      } else {
        await api.assignRequest(selectedReq.id, assignment);
      }
      setSelectedReq(null);
      setSelectedTrip(null);
      setAutoAssign(true);
      setSelectedVehId("");
      showToast(selectedTrip ? "Tanker assignment updated." : "Tanker assigned successfully.", "success");
      await fetchData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to assign request.", "error");
      setError(err.message || "Failed to assign request.");
    } finally {
      setSubmitting(false);
    }
  };

  const getHotelName = (hotelId: number) => {
    const hotel = hotels.find((h) => h.id === hotelId);
    return hotel ? hotel.hotel_name : `Hotel ID: ${hotelId}`;
  };

  const getDriverName = (driverId?: number | null) => {
    if (!driverId) return "Unassigned Driver";
    const driver = drivers.find((d) => d.id === driverId);
    return driver ? driver.name : `Driver ID: ${driverId}`;
  };

  // Status Filter Options
  const filterOptions: RequestStatus[] = [
    "requested",
    "approved",
    "assigned",
    "in_progress",
    "collected",
    "received_at_plant",
    "completed",
    "invoiced",
    "paid",
    "cancelled",
  ];

  const columns: Column<PickupRequest>[] = [
    {
      header: "Code",
      accessor: "request_code",
      className: "font-mono font-bold text-slate-800",
    },
    {
      header: "Hotel",
      accessor: (item) => getHotelName(item.hotel_id),
      className: "font-semibold text-slate-700",
    },
    {
      header: "Volume",
      accessor: (item) => (item.estimated_litres ? `${item.estimated_litres.toLocaleString()} L` : "-"),
      className: "font-mono text-slate-650",
    },
    {
      header: "Urgency",
      accessor: (item) => {
        const urgent = item.urgency === "urgent" || item.urgency === "high";
        return (
          <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
            item.urgency === "high"
              ? "border-red-200 bg-red-50 text-red-700"
              : urgent
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-slate-50 text-slate-500"
          }`}>
            {item.urgency || "normal"}
          </span>
        );
      },
    },
    {
      header: "Wastewater Type",
      accessor: (item) => item.wastewater_type.charAt(0).toUpperCase() + item.wastewater_type.slice(1),
      className: "text-slate-600 font-medium",
    },
    {
      header: "Status",
      accessor: (item) => <StatusBadge status={item.status} />,
    },
    {
      header: "Actions",
      accessor: (item) => {
        const statusClean = item.status ? item.status.toLowerCase() : "";
        if (statusClean === "requested") {
          return (
            <button
              onClick={() => handleApprove(item.id)}
              disabled={actionLoadingId === item.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
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
        if (statusClean === "approved" || statusClean === "assigned") {
          const trip = trips.find((candidate) => candidate.request_id === item.id) || null;
          const canEdit = statusClean === "assigned" && trip?.status === "assigned" && !trip.accepted_at;
          return (
            <button
              onClick={() => {
                setSelectedReq(item);
                setSelectedTrip(canEdit ? trip : null);
                setAutoAssign(!canEdit);
                setSelectedVehId("");
              }}
              disabled={statusClean === "assigned" && !canEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {canEdit ? "Edit Assignment" : statusClean === "assigned" ? "Locked" : "Assign Tanker"}
            </button>
          );
        }
        return <span className="text-xs text-gray-400 font-medium">None</span>;
      },
    },
  ];

  // Filter available vehicles (those with status "available" and an assigned ACTIVE driver) for manual dispatch selection
  const availableVehicles = vehicles.filter((v) => {
    if (v.status !== "available" || !v.driver_id) return false;
    const driver = drivers.find((d) => d.id === v.driver_id);
    return driver?.status === "active";
  });

  return (
    <ProtectedRoute>
        <div className="space-y-6">
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 pb-5">
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                Filter Status:
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white"
              >
                <option value="">All Requests</option>
                {filterOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm cursor-pointer self-end md:self-auto"
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

          {loading && requests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-150 rounded-2xl shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-sm text-gray-500 font-medium">Fetching wastewater requests...</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={requests}
              keyExtractor={(item) => item.id}
              emptyMessage="No wastewater collection requests match the filter."
            />
          )}

          {/* Assign Tanker Modal */}
          {selectedReq && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-gray-150 max-w-md w-full shadow-2xl p-6 relative">
                <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  {selectedTrip ? "Edit Tanker Assignment" : "Dispatch Wastewater Tanker"}
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  {selectedTrip ? "Updating" : "Assigning"} request <span className="font-bold font-mono text-slate-800">{selectedReq.request_code}</span> ({getHotelName(selectedReq.hotel_id)})
                </p>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span>Error loading available drivers or vehicles. Please try again. ({error})</span>
                  </div>
                )}

                <form onSubmit={handleAssign} className="space-y-4">
                  {/* Auto vs Manual Assign Toggle */}
                  <div className="bg-gray-50 p-1 rounded-xl flex gap-1 border border-gray-150">
                    <button
                      type="button"
                      onClick={() => setAutoAssign(true)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        autoAssign
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      System Auto-Assign
                    </button>
                    <button
                      type="button"
                      onClick={() => setAutoAssign(false)}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        !autoAssign
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      Manual Selection
                    </button>
                  </div>

                  {!autoAssign && (
                    <div className="space-y-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Select Available Vehicle & Driver
                      </label>
                      {availableVehicles.length === 0 ? (
                        <div className="text-xs text-red-500 italic p-3 border border-red-100 bg-red-50/50 rounded-xl">
                          No active vehicles are currently available. Please use auto-assign or make vehicles available in the Fleet section.
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                          {(() => {
                            // Find the recommended vehicle id
                            const needed = selectedReq?.estimated_litres || 0;
                            let recVehId: number | null = null;
                            let bestScore = Infinity;
                            availableVehicles.forEach((v) => {
                              let score = v.capacity_litres;
                              if (v.capacity_litres < needed) {
                                score += 10000;
                              } else {
                                score = v.capacity_litres - needed;
                              }
                              if (score < bestScore) {
                                bestScore = score;
                                recVehId = v.id;
                              }
                            });

                            return availableVehicles.map((v) => {
                              const isSelected = selectedVehId === String(v.id);
                              const isRecommended = v.id === recVehId;
                              const driverName = getDriverName(v.driver_id);
                              const locationStr = v.last_lat && v.last_lng ? `${v.last_lat.toFixed(4)}, ${v.last_lng.toFixed(4)}` : "Not available";
                              
                              return (
                                <div
                                  key={v.id}
                                  onClick={() => setSelectedVehId(String(v.id))}
                                  className={`p-3 rounded-xl border transition-all cursor-pointer text-left relative ${
                                    isSelected
                                      ? "border-indigo-600 bg-indigo-50/40 shadow-sm"
                                      : "border-gray-200 hover:border-gray-300 bg-white"
                                  }`}
                                >
                                  {isRecommended && (
                                    <span className="absolute top-2.5 right-2.5 bg-indigo-100 text-indigo-750 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                      ⭐ Recommended Match
                                    </span>
                                  )}
                                  <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                                    <span>{v.vehicle_number}</span>
                                    <span className="text-[10px] text-gray-400 font-semibold">(Cap: {v.capacity_litres.toLocaleString()}L)</span>
                                  </div>
                                  <div className="mt-1.5 grid grid-cols-2 gap-y-1 text-[10px] text-gray-500 font-semibold">
                                    <div>
                                      <span className="text-gray-400 font-normal">Driver:</span> {driverName}
                                    </div>
                                    <div>
                                      <span className="text-gray-400 font-normal">Status:</span> <span className="text-green-600">Active</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400 font-normal">Availability:</span> <span className="text-green-600">Available</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400 font-normal">Location:</span> <span className="font-mono">{locationStr}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {autoAssign && (
                    <div className="text-xs text-indigo-600 border border-indigo-100 bg-indigo-50/40 p-4 rounded-xl leading-normal">
                      The backend matching engine will automatically assign the closest available tanker with sufficient capacity.
                    </div>
                  )}

                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReq(null);
                        setSelectedVehId("");
                      }}
                      className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || (!autoAssign && !selectedVehId)}
                      className="px-4 py-2 text-sm font-bold text-white bg-indigo-650 hover:bg-indigo-750 rounded-xl shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? (selectedTrip ? "Updating..." : "Dispatching...") : (selectedTrip ? "Save Assignment" : "Confirm Dispatch")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
    </ProtectedRoute>
  );
}
