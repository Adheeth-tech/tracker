"use client";

import React, { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { api } from "../../lib/api";
import { VehiclePosition, Hotel } from "../../lib/types";
import ProtectedRoute from "../../components/ProtectedRoute";
import AppShell from "../../components/AppShell";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import {
  AlertCircle,
  RefreshCw,
  Map as MapIcon,
  Table as TableIcon,
  Search,
  Navigation,
  Info,
  MapPin,
  Clock,
  Compass,
} from "lucide-react";

// Dynamically import the LiveMap component to disable SSR for Leaflet
const LiveMap = dynamic(() => import("../../components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[550px] flex flex-col items-center justify-center bg-slate-50 border border-gray-150 rounded-2xl shadow-sm">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      <p className="mt-4 text-sm text-gray-500 font-medium animate-pulse">Initializing map engine...</p>
    </div>
  ),
});

export default function TrackingPage() {
  const [positions, setPositions] = useState<VehiclePosition[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map configuration state
  const [viewMode, setViewMode] = useState<"map" | "table">("map");
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [trail, setTrail] = useState<{ lat: number; lng: number; speed?: number | null; status: string; ts: string }[] | null>(null);
  const [loadingTrail, setLoadingTrail] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, startTransition] = useTransition();

  const fetchHotels = async () => {
    try {
      const data = await api.listHotels();
      setHotels(data);
    } catch (err) {
      console.error("Failed to load hotels:", err);
    }
  };

  const fetchPositions = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.liveMap();
      setPositions(data);
      setError(null);
    } catch (err: any) {
      console.error("Live tracking polling failed:", err);
      if (!silent || positions.length === 0) {
        setError(err.message || "Failed to load live tracking positions.");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchTrail = async (tripId: number) => {
    try {
      setLoadingTrail(true);
      const trailData = await api.tripTrail(tripId);
      setTrail(trailData);
    } catch (err) {
      console.error(`Failed to fetch trail for trip #${tripId}:`, err);
      setTrail([]);
    } finally {
      setLoadingTrail(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchPositions();
    fetchHotels();

    // Setup polling every 20 seconds
    const interval = setInterval(() => {
      fetchPositions(true);
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  // Whenever selected vehicle changes, load its trail if it is on a trip
  useEffect(() => {
    if (selectedVehicleId) {
      const selectedVehicle = positions.find((v) => v.vehicle_id === selectedVehicleId);
      if (selectedVehicle && selectedVehicle.trip_id) {
        fetchTrail(selectedVehicle.trip_id);
      } else {
        setTrail(null);
      }
    } else {
      setTrail(null);
    }
  }, [selectedVehicleId, positions]);

  const handleSelectVehicle = (vehicleId: number) => {
    setSelectedVehicleId(vehicleId);
  };

  const clearSelection = () => {
    setSelectedVehicleId(null);
    setTrail(null);
  };

  // Helper stats for side metrics
  const activeTripsCount = positions.filter((v) => v.status === "on_trip").length;
  const availableCount = positions.filter((v) => v.status === "available").length;

  // Filtered positions based on query and state
  const filteredPositions = positions.filter((v) => {
    const matchesSearch = v.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedVehicleObj = positions.find((v) => v.vehicle_id === selectedVehicleId);

  // DataTable columns for Table view fallback
  const columns: Column<VehiclePosition>[] = [
    {
      header: "Vehicle Number",
      accessor: "vehicle_number",
      className: "font-mono font-bold text-slate-800",
    },
    {
      header: "Status",
      accessor: (item) => <StatusBadge status={item.status as any} />,
    },
    {
      header: "Last Latitude",
      accessor: (item) => (item.latitude !== null && item.latitude !== undefined ? item.latitude.toFixed(6) : "-"),
      className: "font-mono text-slate-600",
    },
    {
      header: "Last Longitude",
      accessor: (item) => (item.longitude !== null && item.longitude !== undefined ? item.longitude.toFixed(6) : "-"),
      className: "font-mono text-slate-600",
    },
    {
      header: "Active Trip ID",
      accessor: (item) => (item.trip_id ? `Trip #${item.trip_id}` : "No Active Trip"),
      className: "font-semibold text-slate-500",
    },
    {
      header: "Actions",
      accessor: (item) => (
        <button
          onClick={() => {
            setViewMode("map");
            handleSelectVehicle(item.vehicle_id);
          }}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          View on Map
        </button>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-150 pb-5">
            <div>
              <p className="text-xs text-gray-400 font-medium">
                Real-time status, locations, and route trails of the transport fleet (20s auto-refresh)
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Toggle switch for view mode */}
              <div className="bg-gray-100 p-0.5 rounded-xl border border-gray-200 flex gap-0.5 shadow-inner">
                <button
                  onClick={() => setViewMode("map")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "map"
                      ? "bg-white text-indigo-650 shadow-sm"
                      : "text-gray-500 hover:text-slate-900"
                  }`}
                >
                  <MapIcon className="h-3.5 w-3.5" />
                  Map View
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === "table"
                      ? "bg-white text-indigo-650 shadow-sm"
                      : "text-gray-500 hover:text-slate-900"
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  Table View
                </button>
              </div>

              <button
                onClick={() => fetchPositions(false)}
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

          {loading && positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-150 rounded-2xl shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-sm text-gray-500 font-medium animate-pulse">Loading telemetry feed...</p>
            </div>
          ) : viewMode === "table" ? (
            <DataTable
              columns={columns}
              data={positions}
              keyExtractor={(item) => item.vehicle_id}
              emptyMessage="No active tracking data available."
            />
          ) : (
            // GRID LAYOUT FOR INTERACTIVE MAP VIEW
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
              
              {/* MAP BOX (2/3 width) */}
              <div className="lg:col-span-2 flex flex-col min-h-[550px]">
                <LiveMap
                  positions={positions}
                  hotels={hotels}
                  selectedVehicleId={selectedVehicleId}
                  onSelectVehicle={handleSelectVehicle}
                  trail={trail}
                />
              </div>

              {/* CONTROLS & SIDEBAR PANEL (1/3 width) */}
              <div className="lg:col-span-1 flex flex-col bg-white border border-gray-150 rounded-2xl shadow-sm p-5 space-y-4">
                
                {/* Micro telemetry stats bar */}
                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">On Trip</span>
                    <h5 className="text-lg font-black text-slate-800 leading-tight mt-0.5">{activeTripsCount}</h5>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Available</span>
                    <h5 className="text-lg font-black text-slate-800 leading-tight mt-0.5">{availableCount}</h5>
                  </div>
                </div>

                {/* Search & filters inside sidebar */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search vehicle number..."
                      value={searchQuery}
                      onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  {/* Filter tabs */}
                  <div className="flex gap-1.5 flex-wrap">
                    {["all", "on_trip", "available", "maintenance"].map((status) => (
                      <button
                        key={status}
                        onClick={() => startTransition(() => setStatusFilter(status))}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          statusFilter === status
                            ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {status === "all" ? "All" : status.replace("_", " ").toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sidebar Vehicle List */}
                <div className="flex-1 overflow-y-auto max-h-[220px] divide-y divide-gray-100 border border-gray-150 rounded-xl">
                  {filteredPositions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400 italic">No tankers matching criteria</div>
                  ) : (
                    filteredPositions.map((vehicle) => {
                      const isSelected = selectedVehicleId === vehicle.vehicle_id;
                      return (
                        <button
                          key={vehicle.vehicle_id}
                          onClick={() => handleSelectVehicle(vehicle.vehicle_id)}
                          className={`w-full text-left p-3 flex justify-between items-center transition-all cursor-pointer ${
                            isSelected
                              ? "bg-indigo-50/70 hover:bg-indigo-50"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs font-bold text-slate-800">{vehicle.vehicle_number}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-slate-400">
                                {vehicle.trip_id ? `Trip #${vehicle.trip_id}` : "No Active Trip"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={vehicle.status as any} />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Entity Focus Detail Card */}
                {selectedVehicleObj ? (
                  <div className="bg-indigo-900 text-white p-4 rounded-xl space-y-3 relative shadow-md">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] text-indigo-300 font-bold uppercase tracking-wider">Tanker Details</span>
                        <h4 className="text-sm font-extrabold font-mono tracking-tight">{selectedVehicleObj.vehicle_number}</h4>
                      </div>
                      <button
                        onClick={clearSelection}
                        className="text-[10px] text-indigo-200 hover:text-white bg-indigo-850 hover:bg-indigo-800 px-2 py-0.5 rounded font-bold cursor-pointer"
                      >
                        Reset Map
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs border-t border-indigo-800/60 pt-2.5">
                      <div className="flex items-center gap-2">
                        <Compass className="h-3.5 w-3.5 text-indigo-300" />
                        <div>
                          <p className="text-[9px] text-indigo-300 font-semibold leading-none">Status</p>
                          <p className="font-bold text-white capitalize mt-0.5 text-[11px]">
                            {selectedVehicleObj.status.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-indigo-300" />
                        <div>
                          <p className="text-[9px] text-indigo-300 font-semibold leading-none">Coordinates</p>
                          <p className="font-mono text-white mt-0.5 text-[10px]">
                            {selectedVehicleObj.latitude !== null && selectedVehicleObj.latitude !== undefined
                              ? `${selectedVehicleObj.latitude.toFixed(4)}, ${selectedVehicleObj.longitude?.toFixed(4)}`
                              : "No GPS lock"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedVehicleObj.trip_id && (
                      <div className="bg-indigo-950/45 p-3 rounded-lg border border-indigo-800/40 space-y-2">
                        <div className="flex justify-between items-center text-[10px] text-indigo-300">
                          <span className="font-bold">LIVE ROUTE HISTORY</span>
                          {loadingTrail ? (
                            <Clock className="h-3 w-3 animate-spin" />
                          ) : (
                            <span>{trail?.length || 0} pings</span>
                          )}
                        </div>
                        {trail && trail.length > 0 ? (
                          <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                            {trail.slice(0, 3).map((ping, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[9px] font-mono text-indigo-200">
                                <span>{ping.status.replace("_", " ").toUpperCase()}</span>
                                <span>{new Date(ping.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            ))}
                            {trail.length > 3 && (
                              <p className="text-[9px] text-indigo-300 italic text-center pt-1 border-t border-indigo-900/40">
                                + {trail.length - 3} more coordinates on map
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-[10px] text-indigo-300 italic">No GPS breadcrumbs logged yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start gap-3">
                    <Info className="h-4 w-4 text-indigo-650 mt-0.5" />
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      Select a vehicle from the list or map to view details, active coordinates, and trace its real-time route.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
