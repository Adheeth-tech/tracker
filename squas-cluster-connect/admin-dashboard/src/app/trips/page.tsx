"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { Trip, Vehicle, TripStatus, Driver } from "../../lib/types";
import ProtectedRoute from "../../components/ProtectedRoute";
import AppShell from "../../components/AppShell";
import DataTable, { Column } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { AlertCircle, RefreshCw, Eye, Navigation, Award, Compass, Trash2 } from "lucide-react";

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  
  const [onlyActive, setOnlyActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail Modal State
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [allowedNext, setAllowedNext] = useState<string[]>([]);
  const [targetState, setTargetState] = useState("");
  const [lat, setLat] = useState("10.53");
  const [lng, setLng] = useState("76.21");

  // Quantity Form State
  const [driverLitres, setDriverLitres] = useState("");
  const [collectedLitres, setCollectedLitres] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [tripData, vehData, drvData] = await Promise.all([
        api.listTrips(onlyActive),
        api.listVehicles(),
        api.listDrivers(),
      ]);

      setTrips(tripData);
      setVehicles(vehData);
      setDrivers(drvData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load trips.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [onlyActive]);

  const loadTripDetails = async (trip: Trip) => {
    setError(null);
    setSelectedTrip(trip);
    setModalLoading(true);
    setTargetState("");
    try {
      const res = await api.nextStates(trip.id);
      setAllowedNext(res.allowed || []);
      if (res.allowed && res.allowed.length > 0) {
        setTargetState(res.allowed[0]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load next transitions for trip.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleAdvanceState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip || !targetState) return;

    setError(null);
    setModalLoading(true);
    try {
      const location = {
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      };
      
      const updatedTrip = await api.advanceTrip(
        selectedTrip.id,
        targetState as TripStatus,
        location
      );

      // Reload lists and details
      await fetchData();
      setSelectedTrip(updatedTrip);
      
      // Fetch new next states
      const res = await api.nextStates(updatedTrip.id);
      setAllowedNext(res.allowed || []);
      if (res.allowed && res.allowed.length > 0) {
        setTargetState(res.allowed[0]);
      } else {
        setTargetState("");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to advance trip state.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleRecordQuantity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip) return;

    setError(null);
    setModalLoading(true);
    try {
      await api.recordQuantity(selectedTrip.id, {
        driver_entered_litres: driverLitres ? parseFloat(driverLitres) : undefined,
        collected_litres: collectedLitres ? parseFloat(collectedLitres) : undefined,
      });
      
      setDriverLitres("");
      setCollectedLitres("");
      
      // Fetch updated trip
      await fetchData();
      
      // Re-trigger details load to update modal UI
      const tripList = await api.listTrips(onlyActive);
      const matched = tripList.find((t) => t.id === selectedTrip.id);
      if (matched) {
        setSelectedTrip(matched);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to record quantity.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (tripId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this trip history completely? This will also delete the associated request to start fresh."
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.deleteTrip(tripId);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to delete trip.");
    } finally {
      setLoading(false);
    }
  };

  const getDriverName = (driverId: number) => {
    const driver = drivers.find((d) => d.id === driverId);
    return driver ? driver.name : `Driver ID: ${driverId}`;
  };

  const getVehicleNumber = (vehicleId: number) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    return vehicle ? vehicle.vehicle_number : `Vehicle ID: ${vehicleId}`;
  };

  const formatTimestamp = (ts?: string | null) => {
    if (!ts) return "-";
    return new Date(ts).toLocaleString();
  };

  const columns: Column<Trip>[] = [
    {
      header: "Trip Code",
      accessor: (item) => (
        <Link href={`/trips/${item.id}`} className="hover:underline text-indigo-650 font-mono font-bold">
          {item.trip_code}
        </Link>
      ),
    },
    {
      header: "Driver",
      accessor: (item) => getDriverName(item.driver_id),
      className: "font-semibold text-slate-700",
    },
    {
      header: "Tanker",
      accessor: (item) => getVehicleNumber(item.vehicle_id),
      className: "font-mono font-semibold text-slate-600",
    },
    {
      header: "Status",
      accessor: (item) => (
        <div className="flex flex-col gap-1 items-start">
          <StatusBadge status={item.status} />
          {item.status === "assigned" && !item.accepted_at && (
            <span className="text-[10px] text-amber-500 font-bold italic">
              Awaiting driver acceptance
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Assigned At",
      accessor: (item) => formatTimestamp(item.assigned_at),
      className: "text-xs text-slate-500",
    },
    {
      header: "Actions",
      accessor: (item) => (
        <div className="flex gap-2">
          <Link
            href={`/trips/${item.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            Monitor Telemetry
          </Link>
          <button
            onClick={() => loadTripDetails(item)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Compass className="h-3.5 w-3.5" />
            Advance Status
          </button>
          <button
            onClick={() => handleDelete(item.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-600 hover:text-white text-red-700 border border-red-200 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete History
          </button>
        </div>
      ),
    },
  ];

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Controls Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 pb-5">
            <div className="flex items-center gap-4">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyActive}
                  onChange={(e) => setOnlyActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                <span className="ms-3 text-sm font-semibold text-gray-700">Active Trips Only</span>
              </label>
            </div>

            <button
              onClick={fetchData}
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

          {loading && trips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-150 rounded-2xl shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
              <p className="mt-4 text-sm text-gray-500 font-medium">Fetching dispatch trips...</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={trips}
              keyExtractor={(item) => item.id}
              emptyMessage="No dispatch trips matching the criteria."
            />
          )}

          {/* Trip Monitoring Modal */}
          {selectedTrip && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-gray-150 max-w-2xl w-full shadow-2xl p-6 relative">
                {/* Modal Title */}
                <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <Navigation className="h-5 w-5 text-indigo-600 animate-pulse" />
                  Trip Monitoring Control
                </h3>
                <p className="text-xs text-gray-400 mb-6">
                  Monitoring Trip <span className="font-bold font-mono text-slate-800">{selectedTrip.trip_code}</span>
                </p>

                {modalLoading && (
                  <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center rounded-2xl z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Trip Info */}
                  <div className="space-y-4 text-xs font-semibold text-slate-700 bg-gray-50/50 p-4 border border-gray-150 rounded-xl">
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span>Status</span>
                      <StatusBadge status={selectedTrip.status} />
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span>Driver Name</span>
                      <span className="text-slate-900">{getDriverName(selectedTrip.driver_id)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span>Tanker Plate</span>
                      <span className="font-mono text-slate-900">{getVehicleNumber(selectedTrip.vehicle_id)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span>Assigned At</span>
                      <span className="font-mono text-slate-900">{formatTimestamp(selectedTrip.assigned_at)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span>Collected At</span>
                      <span className="font-mono text-slate-900">{formatTimestamp(selectedTrip.collected_at)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-gray-100">
                      <span>Completed At</span>
                      <span className="font-mono text-slate-900">{formatTimestamp(selectedTrip.completed_at)}</span>
                    </div>
                  </div>

                  {/* Right Column: Workflow Actions */}
                  <div className="space-y-6">
                    {/* Advance Status Form */}
                    {allowedNext.length > 0 ? (
                      <form onSubmit={handleAdvanceState} className="space-y-3 bg-indigo-50/20 border border-indigo-100 p-4 rounded-xl">
                        <h4 className="text-xs font-bold text-indigo-850 uppercase tracking-wider flex items-center gap-1.5">
                          <RefreshCw className="h-3.5 w-3.5 text-indigo-650" />
                          Simulate Status Transition
                        </h4>
                        
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Target State</label>
                            <select
                              value={targetState}
                              onChange={(e) => setTargetState(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs font-bold bg-white"
                            >
                              {allowedNext.map((state) => (
                                <option key={state} value={state}>
                                  {state.replace(/_/g, " ").toUpperCase()}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* GPS Location Simulation */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Latitude</label>
                            <input
                              type="text"
                              value={lat}
                              onChange={(e) => setLat(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Longitude</label>
                            <input
                              type="text"
                              value={lng}
                              onChange={(e) => setLng(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold font-mono"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Trigger State Advance
                        </button>
                      </form>
                    ) : (
                      <div className="text-xs text-gray-400 font-medium italic border border-gray-150 p-4 rounded-xl text-center bg-gray-50/30">
                        This trip has reached a final state (CLOSED/CANCELLED). No further status transitions allowed.
                      </div>
                    )}

                    {/* Record Quantity Form */}
                    {selectedTrip.status !== "closed" && selectedTrip.status !== "cancelled" && (
                      <form onSubmit={handleRecordQuantity} className="space-y-3 bg-emerald-50/20 border border-emerald-100 p-4 rounded-xl">
                        <h4 className="text-xs font-bold text-emerald-850 uppercase tracking-wider flex items-center gap-1.5">
                          <Award className="h-3.5 w-3.5 text-emerald-650" />
                          Record Waste Quantity
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Driver Litres</label>
                            <input
                              type="number"
                              required
                              placeholder="1000"
                              value={driverLitres}
                              onChange={(e) => setDriverLitres(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Collected Litres</label>
                            <input
                              type="number"
                              required
                              placeholder="1080"
                              value={collectedLitres}
                              onChange={(e) => setCollectedLitres(e.target.value)}
                              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 bg-emerald-650 hover:bg-emerald-750 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Record Quantity & Price Trip
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Close Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setSelectedTrip(null);
                      setAllowedNext([]);
                    }}
                    className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                  >
                    Close Monitor
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
