"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { Trip, Payment } from "../../../lib/types";
import ProtectedRoute from "../../../components/ProtectedRoute";
import AppShell from "../../../components/AppShell";
import StatusBadge from "../../../components/StatusBadge";
import LocationInput from "../../../components/LocationInput";
import NavigationPanel from "../../../components/NavigationPanel";
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Clock,
  Compass,
  CheckCircle2,
  AlertTriangle,
  FolderLock,
  Check,
  X
} from "lucide-react";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = parseInt(params.id as string);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [allowedStates, setAllowedStates] = useState<string[]>([]);
  const [payment, setPayment] = useState<Payment | null>(null);
  
  // Loading & state status
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Status transition form state
  const [selectedTargetState, setSelectedTargetState] = useState<string | null>(null);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  // Quantity recording form state
  const [driverLitres, setDriverLitres] = useState("");
  const [source, setSource] = useState("manual");
  const [photoUrl, setPhotoUrl] = useState("");
  const [quantitySuccess, setQuantitySuccess] = useState(false);

  // Payment recording form state
  const [payMode, setPayMode] = useState<string>("cash");
  const [payStatus, setPayStatus] = useState<string>("unpaid");
  const [transId, setTransId] = useState<string>("");
  const [ratePerLitre, setRatePerLitre] = useState<string>("");
  const [paySuccess, setPaySuccess] = useState(false);

  // Tracking state and refs for fallback pinging
  const [lastLat, setLastLat] = useState("");
  const [lastLng, setLastLng] = useState("");
  const latRef = useRef("");
  const lngRef = useRef("");

  // Background live location tracking loop
  useEffect(() => {
    let intervalId: any = null;
    let watchId: any = null;

    const isActive =
      trip &&
      [
        "driver_started",
        "reached_hotel",
        "collection_started",
        "collection_completed",
        "moving_to_plant",
        "reached_plant",
        "unloaded",
      ].includes(trip.status.toLowerCase());

    if (trip && isActive) {
      const ping = async (lat: number, lng: number, speed?: number | null) => {
        try {
          await api.pingLocation(trip.id, lat, lng, speed);
          console.log("Pinged location:", lat, lng, speed);
        } catch (err) {
          console.error("Failed to ping location:", err);
        }
      };

      // 1. Geolocation watchPosition
      if (typeof window !== "undefined" && navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude: lt, longitude: lg, speed: sp } = pos.coords;
            latRef.current = lt.toString();
            lngRef.current = lg.toString();
            setLastLat(lt.toString());
            setLastLng(lg.toString());
            ping(lt, lg, sp);
          },
          (err) => {
            console.warn("Geolocation watch error:", err);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      }

      // 2. Fallback periodic ping (every 10s) using the last confirmed coordinates.
      intervalId = setInterval(() => {
        const currentLat = parseFloat(latRef.current);
        const currentLng = parseFloat(lngRef.current);
        if (Number.isFinite(currentLat) && Number.isFinite(currentLng)) {
          ping(currentLat, currentLng);
        }
      }, 10000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (watchId !== null && typeof window !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [trip?.status, trip?.id]);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);

      const tripData = await api.getTrip(tripId);
      setTrip(tripData);

      // Get next states
      try {
        const statesData = await api.getNextStates(tripId);
        setAllowedStates(statesData.allowed);
      } catch (err) {
        console.warn("Failed to fetch next states:", err);
      }

      // Get payment if priced/processed
      try {
        const payData = await api.getPayment(tripId);
        setPayment(payData);
        if (payData) {
          setPayMode(payData.payment_mode || "cash");
          setPayStatus(payData.payment_status || "unpaid");
          setTransId(payData.transaction_id || "");
          setRatePerLitre(payData.rate_per_litre ? String(payData.rate_per_litre) : "");
        }
      } catch (err) {
        setPayment(null);
      }

      setError(null);
    } catch (err: any) {
      console.error(err);
      if (!silent) setError(err.message || "Failed to load job details.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleAccept = async (id: number) => {
    setActionLoading(true);
    try {
      await api.acceptTrip(id);
      await loadData(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to accept trip assignment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (id: number) => {
    if (!confirm("Are you sure you want to decline this job offer?")) return;
    setActionLoading(true);
    try {
      await api.declineTrip(id);
      router.replace("/jobs");
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to decline trip assignment.");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) {
      loadData();
    }
  }, [tripId]);

  // Trigger state transition
  const handleAdvanceState = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetState) return;

    const targetState = selectedTargetState;
    setActionLoading(true);
    try {
      const loc =
        latitude && longitude
          ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
          : undefined;

      await api.advanceTrip(tripId, targetState, loc);
      
      // Reset transition form
      setSelectedTargetState(null);
      setLatitude("");
      setLongitude("");
      
      // Reload page data
      await loadData(true);

      if (targetState === "closed") {
        alert("Trip completed successfully!");
        router.push("/jobs");
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to advance trip state.");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit collected quantity
  const handleRecordQuantity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverLitres) return;

    setActionLoading(true);
    setQuantitySuccess(false);

    try {
      await api.recordQuantity(
        tripId,
        parseFloat(driverLitres),
        source,
        photoUrl || undefined
      );
      setQuantitySuccess(true);
      
      // Reload page data
      await loadData(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to record quantity.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setPaySuccess(false);
    try {
      const updated = await api.updatePayment(tripId, {
        payment_mode: payMode,
        payment_status: payStatus,
        transaction_id: transId || undefined,
        rate_per_litre: ratePerLitre ? parseFloat(ratePerLitre) : undefined,
      });
      setPayment(updated);
      setPaySuccess(true);
      setTimeout(() => setPaySuccess(false), 5000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to update payment details.");
    } finally {
      setActionLoading(false);
    }
  };

  // Format status enum to driver readable label
  const formatStateLabel = (state: string) => {
    return state.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Header Row */}
          <div className="flex justify-between items-center border-b border-gray-150 pb-5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-medium">Job execution and telemetry updates</span>
            </div>
            <Link
              href="/jobs"
              className="text-xs font-bold text-gray-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to active list
            </Link>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-semibold flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {loading && !trip ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-gray-150 rounded-2xl shadow-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-650"></div>
              <p className="mt-4 text-sm text-gray-500 font-medium">Loading Job details...</p>
            </div>
          ) : (
            trip && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Area (2/3 width) - Job Details and Telemetry Advancements */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Job Details Card */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Job Ticket</span>
                        <h3 className="text-md font-bold text-slate-800 font-mono mt-0.5">{trip.trip_code}</h3>
                      </div>
                      <StatusBadge status={trip.status as any} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Hotel Details</span>
                        <p className="font-bold text-slate-850 mt-1">{trip.request?.hotel?.hotel_name || "N/A"}</p>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Pickup Location</span>
                        <p className="font-semibold text-slate-700 mt-1">{trip.request?.hotel?.address || "N/A"}</p>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Drop Location</span>
                        <p className="font-semibold text-slate-700 mt-1">Central Wastewater Treatment Plant</p>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Vehicle Details</span>
                        <p className="font-semibold text-slate-850 mt-1">
                          {trip.vehicle?.vehicle_number || `Vehicle #${trip.vehicle_id}`} 
                          {trip.vehicle?.capacity_litres ? ` (Cap: ${trip.vehicle.capacity_litres.toLocaleString()}L)` : ""}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Load Information</span>
                        <p className="font-semibold text-slate-850 mt-1 capitalize">
                          {trip.request?.wastewater_type || "N/A"} ({trip.request?.estimated_litres?.toLocaleString() || "0"} L)
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Pickup Time</span>
                        <p className="font-semibold text-slate-700 mt-1">
                          {trip.request?.requested_date || ""} {trip.request?.time_window ? `(${trip.request.time_window})` : ""}
                        </p>
                      </div>

                      {trip.request?.access_instructions && (
                        <div className="col-span-full bg-slate-50 border border-slate-100 p-3 rounded-xl">
                          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Access Instructions</span>
                          <p className="text-slate-650 text-[11px] font-medium leading-relaxed">{trip.request.access_instructions}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trip State Advancement Panel */}
                  <NavigationPanel trip={trip} latitude={lastLat} longitude={lastLng} />

                  {/* Trip State Advancement Panel */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3 justify-between">
                      <div className="flex items-center gap-2">
                        <Compass className="h-4.5 w-4.5 text-indigo-650" />
                        <h4 className="text-sm font-bold text-slate-800">Telemetry Status Controls</h4>
                      </div>
                      {trip && [
                        "driver_started",
                        "reached_hotel",
                        "collection_started",
                        "collection_completed",
                        "moving_to_plant",
                        "reached_plant",
                        "unloaded"
                      ].includes(trip.status.toLowerCase()) && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-[10px] font-bold">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-650"></span>
                          </span>
                          <span>Live tracking active</span>
                        </div>
                      )}
                    </div>

                    {trip.accepted_at === null ? (
                      <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-2xl space-y-4">
                        <p className="text-xs text-indigo-900 font-semibold leading-relaxed">
                          This job assignment is proposed. Please accept the task to unlock telemetry status controls.
                        </p>
                        <div className="flex gap-3 text-xs">
                          <button
                            onClick={() => handleAccept(trip.id)}
                            disabled={actionLoading}
                            className="flex-1 bg-indigo-650 hover:bg-indigo-755 text-white py-2.5 rounded-xl font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                          >
                            <Check className="h-4 w-4" />
                            Accept Assignment
                          </button>
                          <button
                            onClick={() => handleDecline(trip.id)}
                            disabled={actionLoading}
                            className="flex-1 bg-white border border-gray-250 hover:bg-gray-50 text-red-650 py-2.5 rounded-xl font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                          >
                            <X className="h-4 w-4" />
                            Decline Job
                          </button>
                        </div>
                      </div>
                    ) : trip.status.toLowerCase() === "assigned" ? (
                      <div className="space-y-4">
                        <p className="text-xs font-semibold text-slate-600">
                          You have accepted this trip. Click below to start the journey to the hotel.
                        </p>
                        
                        {selectedTargetState === "driver_started" ? (
                          <form onSubmit={handleAdvanceState} className="space-y-4">
                            <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl text-xs text-indigo-850 font-semibold">
                              Confirming journey start to hotel.
                            </div>
                            <LocationInput
                              latitude={latitude}
                              longitude={longitude}
                              onChange={(lat, lng) => {
                                setLatitude(lat);
                                setLongitude(lng);
                              }}
                            />
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => setSelectedTargetState(null)}
                                className="flex-1 px-4 py-2.5 border border-gray-250 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={actionLoading}
                                className="flex-2 flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-755 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {actionLoading ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  "Confirm Start Journey"
                                )}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            onClick={() => setSelectedTargetState("driver_started")}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold transition-all text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Compass className="h-5 w-5" />
                            Start Trip
                          </button>
                        )}
                      </div>
                    ) : trip.status.toLowerCase() === "unloaded" ? (
                      <div className="space-y-4">
                        <p className="text-xs font-semibold text-slate-600">
                          Wastewater has been successfully unloaded at the treatment plant. Click below to end this trip.
                        </p>
                        {selectedTargetState === "closed" ? (
                          <form onSubmit={handleAdvanceState} className="space-y-4">
                            <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl text-xs text-indigo-850 font-semibold">
                              Confirming trip closure. Live tracking will terminate.
                            </div>
                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => setSelectedTargetState(null)}
                                className="flex-1 px-4 py-2.5 border border-gray-250 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={actionLoading}
                                className="flex-2 flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-755 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {actionLoading ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  "Confirm End Journey"
                                )}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            onClick={() => setSelectedTargetState("closed")}
                            className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition-all text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <CheckCircle2 className="h-5 w-5" />
                            End Trip
                          </button>
                        )}
                      </div>
                    ) : allowedStates.length === 0 ? (
                      <div className="bg-slate-50 border border-gray-100 p-4 rounded-xl text-center text-xs text-gray-500 font-semibold flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                        <span>Job has completed its operational lifecycle.</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <span className="text-xs text-gray-400 font-bold block mb-1">Select Next Status Action:</span>
                        <div className="flex flex-wrap gap-2.5">
                          {allowedStates.map((state) => (
                            <button
                              key={state}
                              type="button"
                              onClick={() => setSelectedTargetState(state)}
                              className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                selectedTargetState === state
                                  ? "bg-indigo-650 text-white border-indigo-650 shadow-md shadow-indigo-600/20"
                                  : "bg-white border-gray-250 hover:bg-gray-50 text-gray-700"
                              }`}
                            >
                              Advance to: {formatStateLabel(state)}
                            </button>
                          ))}
                        </div>

                        {selectedTargetState && (
                          <form onSubmit={handleAdvanceState} className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                            <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl text-xs text-indigo-850 font-semibold flex items-start gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span>
                              <span>
                                Confirming status advancement to{" "}
                                <strong className="font-extrabold text-indigo-900">{formatStateLabel(selectedTargetState)}</strong>.
                              </span>
                            </div>

                            <LocationInput
                              latitude={latitude}
                              longitude={longitude}
                              onChange={(lat, lng) => {
                                setLatitude(lat);
                                setLongitude(lng);
                              }}
                            />

                            <div className="flex gap-3">
                              <button
                                type="button"
                                onClick={() => setSelectedTargetState(null)}
                                className="flex-1 px-4 py-2.5 border border-gray-250 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={actionLoading}
                                className="flex-2 flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-755 transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                {actionLoading ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  "Confirm Transition"
                                )}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                {/* Right Area (1/3 width) - Volume Ledger & Billing Info */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* Quantity Records Form / Status Card */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                      <Clock className="h-4.5 w-4.5 text-indigo-650" />
                      <h4 className="text-sm font-bold text-slate-800">Operational Log</h4>
                    </div>

                    {quantitySuccess && (
                      <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 p-3 rounded-lg text-xs font-semibold">
                        Quantity successfully submitted.
                      </div>
                    )}

                    {/* Show Form only when trip is in collection stages */}
                    {["collection_started", "collection_completed", "moving_to_plant", "reached_plant", "unloaded", "closed"].includes(trip.status) ? (
                      <form onSubmit={handleRecordQuantity} className="space-y-4 text-xs font-semibold">
                        <div>
                          <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                            Collected Litres *
                          </label>
                          <input
                            type="number"
                            required
                            min={1}
                            placeholder="e.g. 1200"
                            value={driverLitres}
                            onChange={(e) => setDriverLitres(e.target.value)}
                            className="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                            Collection Method
                          </label>
                          <select
                            value={source}
                            onChange={(e) => setSource(e.target.value)}
                            className="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="manual">Manual Dial Entry</option>
                            <option value="flow_meter">Flow Meter Sensor</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                            Proof Photo URL (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="Link to proof photo..."
                            value={photoUrl}
                            onChange={(e) => setPhotoUrl(e.target.value)}
                            className="block w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-slate-900 placeholder-gray-400 focus:outline-none"
                          />
                          {/* TODO: Add GCS/S3 direct upload integration here */}
                        </div>

                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-755 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {actionLoading ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Log Collected Volume"
                          )}
                        </button>
                      </form>
                    ) : (
                      <div className="bg-amber-50/50 border border-amber-100 p-3.5 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                        <span>Wait until you start collection at the hotel to submit volume logs.</span>
                      </div>
                    )}
                  </div>

                  {/* Editable Billing Summary */}
                  {payment && (
                    <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                        <FolderLock className="h-4.5 w-4.5 text-indigo-450" />
                        <h4 className="text-sm font-bold">Billing Record</h4>
                      </div>

                      {paySuccess && (
                        <div className="bg-emerald-950 border border-emerald-800 text-emerald-300 p-2.5 rounded-lg text-xs font-semibold">
                          Payment details updated successfully.
                        </div>
                      )}

                      <div className="space-y-3.5 text-xs font-semibold">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Total Amount:</span>
                          <span className="font-mono font-bold text-white text-sm">₹{payment.amount?.toLocaleString()}</span>
                        </div>
                        {payment.rate_per_litre && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Current Rate:</span>
                            <span className="font-mono text-slate-300">₹{payment.rate_per_litre.toFixed(2)} / L</span>
                          </div>
                        )}
                      </div>

                      <form onSubmit={handleUpdatePayment} className="space-y-3.5 text-xs font-semibold pt-2 border-t border-slate-800">
                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                            Manual Rate (₹ per Litre)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="e.g. 2.50"
                            value={ratePerLitre}
                            onChange={(e) => setRatePerLitre(e.target.value)}
                            className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                            Payment Status
                          </label>
                          <select
                            value={payStatus}
                            onChange={(e) => setPayStatus(e.target.value)}
                            className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-250 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="unpaid">Unpaid</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                            Payment Mode
                          </label>
                          <select
                            value={payMode}
                            onChange={(e) => setPayMode(e.target.value)}
                            className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-250 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="cash">Cash</option>
                            <option value="upi">UPI</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="credit">Credit / Account</option>
                            <option value="monthly_invoice">Monthly Invoice</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                            Transaction Reference ID (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. TXN9876543210"
                            value={transId}
                            onChange={(e) => setTransId(e.target.value)}
                            className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {actionLoading ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Update Payment details"
                          )}
                        </button>
                      </form>
                    </div>
                  )}

                </div>

              </div>
            )
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
