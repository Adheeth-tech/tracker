"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { Trip, Payment, NavigationRoute } from "../../../lib/types";
import ProtectedRoute from "../../../components/ProtectedRoute";
import AppShell from "../../../components/AppShell";
import StatusBadge from "../../../components/StatusBadge";
import TripProgressMap from "../../../components/TripProgressMap";
import { ArrowLeft, RefreshCw, AlertCircle, MapPin, Truck, Check, HelpCircle, AlertTriangle, Clock } from "lucide-react";

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = parseInt(params.id as string);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [trail, setTrail] = useState<{ lat: number; lng: number; speed?: number | null; status: string; ts: string }[]>([]);
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [quantity, setQuantity] = useState<any | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);

  const [loading, setLoading] = useState(true);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [hotelConfirmedLitres, setHotelConfirmedLitres] = useState<string>("");
  const [varianceRemarks, setVarianceRemarks] = useState("");
  const [confirmSuccess, setConfirmSuccess] = useState(false);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const tripData = await api.getTrip(tripId);
      setTrip(tripData);

      // Fetch trail logs
      try {
        const trailData = await api.getTripTrail(tripId);
        setTrail(trailData);
        if (trailData.length > 0 && !["closed", "cancelled"].includes(tripData.status)) {
          try {
            const routeData = await api.getNavigationRoute(tripId, trailData[0].lat, trailData[0].lng);
            setRoute(routeData);
          } catch (routeErr) {
            console.warn("Failed to load driver directions:", routeErr);
            setRoute(null);
          }
        } else {
          setRoute(null);
        }
      } catch (err) {
        console.error("Failed to load trail:", err);
        setRoute(null);
      }

      // Fetch quantity (safely catch if none exists yet)
      try {
        const qtyData = await api.getQuantity(tripId);
        setQuantity(qtyData);
        if (qtyData && qtyData.hotel_confirmed_litres) {
          setHotelConfirmedLitres(qtyData.hotel_confirmed_litres.toString());
          setVarianceRemarks(qtyData.variance_remarks || "");
        }
      } catch (err) {
        console.warn("No quantity record yet:", err);
        setQuantity(null);
      }

      // Fetch payment (safely catch if not yet priced)
      try {
        const payData = await api.getPayment(tripId);
        setPayment(payData);
      } catch (err) {
        console.warn("No payment priced yet:", err);
        setPayment(null);
      }

      setError(null);
    } catch (err: any) {
      console.error(err);
      if (!silent) setError(err.message || "Failed to load trip details.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (tripId) {
      loadData();
    }
  }, [tripId]);

  // Periodic polling for active trips
  useEffect(() => {
    let intervalId: any = null;

    const isActive =
      trip &&
      !["closed", "cancelled"].includes(trip.status.toLowerCase());

    if (isActive) {
      intervalId = setInterval(() => {
        loadData(true);
      }, 15000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [trip?.status, tripId]);

  const handleConfirmQuantity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelConfirmedLitres) return;

    setConfirmLoading(true);
    setConfirmSuccess(false);

    try {
      const updatedQty = await api.confirmQuantity(
        tripId,
        parseFloat(hotelConfirmedLitres),
        varianceRemarks || undefined
      );
      setQuantity(updatedQty);
      setConfirmSuccess(true);
      // Reload payment in case it was created/priced
      try {
        const payData = await api.getPayment(tripId);
        setPayment(payData);
      } catch (e) {}
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to confirm quantity.");
    } finally {
      setConfirmLoading(false);
    }
  };

  // Determine if quantity confirmation form should be shown.
  // Allowed when status is collection_started, collection_completed, or moving_to_plant.
  const showConfirmForm =
    trip &&
    ["collection_started", "collection_completed", "moving_to_plant"].includes(trip.status);

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6">
          {/* Header Row */}
          <div className="flex justify-between items-center border-b border-gray-150 pb-5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-medium">Detailed tracking telemetry and operator verification</span>
            </div>
            <Link
              href="/trips"
              className="text-xs font-bold text-gray-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to List
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
              <p className="mt-4 text-sm text-gray-500 font-medium">Fetching trip logs...</p>
            </div>
          ) : (
            trip && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Left Area (2/3 width) - Trip Profile and GPS breadcrumbs */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Trip Card */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Trip Code</span>
                        <h3 className="text-md font-bold text-slate-800 font-mono mt-0.5">{trip.trip_code}</h3>
                      </div>
                      <StatusBadge status={trip.status as any} />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Assigned Driver</span>
                        <p className="font-semibold text-slate-850 mt-1">Driver #{trip.driver_id}</p>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Driver Confirmation</span>
                        <p className={`font-bold mt-1 ${trip.accepted_at ? "text-green-600" : "text-amber-500 italic"}`}>
                          {trip.accepted_at ? "Accepted" : "Awaiting Acceptance"}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tanker ID</span>
                        <p className="font-semibold text-slate-850 mt-1">Vehicle #{trip.vehicle_id}</p>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Assigned Timestamp</span>
                        <p className="font-mono text-slate-650 mt-1">
                          {trip.assigned_at ? new Date(trip.assigned_at).toLocaleString() : "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Live driver progress map */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Driver Progress</h4>
                        <p className="mt-1 text-[10px] font-medium text-gray-400">
                          The blue marker shows the driver&apos;s latest GPS position. Updates every 15 seconds while active.
                        </p>
                      </div>
                      {trail.length > 0 && (
                        <span className="rounded bg-indigo-50 px-2 py-1 font-mono text-[10px] font-bold text-indigo-700">
                          Last update: {new Date(trail[0].ts).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <TripProgressMap
                      trail={trail}
                      route={route}
                      destination={trip.request?.hotel ? {
                        name: trip.request.hotel.hotel_name,
                        latitude: trip.request.hotel.latitude,
                        longitude: trip.request.hotel.longitude,
                      } : null}
                    />
                  </div>

                  {/* Complete Operational Timeline */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                      <Clock className="h-4.5 w-4.5 text-indigo-650" />
                      <h4 className="text-sm font-bold text-slate-800">Operational Delivery Timeline</h4>
                    </div>

                    <div className="relative pl-6 border-l-2 border-slate-100 space-y-5 text-xs font-semibold">
                      {[
                        { label: "Order Created", ts: trip.request?.created_at || (trip.assigned_at ? new Date(new Date(trip.assigned_at).getTime() - 600000).toISOString() : null) },
                        { label: "Assigned to Vehicle", ts: trip.assigned_at },
                        { label: "Accepted by Driver", ts: trip.accepted_at },
                        { label: "Journey Started (En Route)", ts: trip.started_at },
                        { label: "Driver Arrived at Hotel", ts: trip.arrived_at },
                        { label: "Loading Started", ts: trip.loading_started_at },
                        { label: "Loading Completed", ts: trip.collected_at },
                        { 
                          label: "Payment Collected", 
                          ts: payment?.payment_status === "paid" ? payment.paid_at || trip.collected_at : null,
                          extra: payment ? `₹${payment.amount?.toLocaleString()} via ${payment.payment_mode?.toUpperCase()}` : undefined 
                        },
                        { label: "Delivery Started to Plant", ts: trip.delivery_started_at },
                        { label: "Delivery Completed (Closed)", ts: trip.completed_at },
                      ].map((node, idx) => {
                        const isDone = !!node.ts;
                        return (
                          <div key={idx} className="relative">
                            <span className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 bg-white transition-all ${
                              isDone ? "border-indigo-600 bg-indigo-50" : "border-slate-200"
                            }`}>
                              {isDone && <span className="absolute top-[2.5px] left-[2.5px] h-1.5 w-1.5 rounded-full bg-indigo-600"></span>}
                            </span>
                            
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <p className={`${isDone ? "text-slate-800 font-bold" : "text-gray-400 font-medium"}`}>
                                  {node.label}
                                </p>
                                {node.extra && isDone && (
                                  <p className="text-[10px] text-indigo-600 font-bold mt-0.5">{node.extra}</p>
                                )}
                              </div>
                              <span className="font-mono text-[10px] text-slate-500 whitespace-nowrap">
                                {node.ts ? new Date(node.ts).toLocaleString() : "Pending"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* GPS Trail logs list */}
                  {/* TODO: Replace plain-text coordinate table with a maps SDK (e.g., Leaflet/Google Maps) */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                      <MapPin className="h-4.5 w-4.5 text-indigo-650" />
                      <h4 className="text-sm font-bold text-slate-800">GPS Trail Telemetry Logs</h4>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-100 text-xs">
                        <thead className="bg-slate-50">
                          <tr className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                            <th className="px-4 py-2.5 text-left">Timestamp</th>
                            <th className="px-4 py-2.5 text-left">Latitude</th>
                            <th className="px-4 py-2.5 text-left">Longitude</th>
                            <th className="px-4 py-2.5 text-left">Logged Status</th>
                            <th className="px-4 py-2.5 text-left">Speed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                          {trail.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                                No GPS pings captured yet.
                              </td>
                            </tr>
                          ) : (
                            trail.map((log, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 font-mono text-slate-650">
                                  {new Date(log.ts).toLocaleString()}
                                </td>
                                <td className="px-4 py-2.5 font-mono text-slate-600">{log.lat.toFixed(6)}</td>
                                <td className="px-4 py-2.5 font-mono text-slate-600">{log.lng.toFixed(6)}</td>
                                <td className="px-4 py-2.5">
                                  <StatusBadge status={log.status as any} />
                                </td>
                                <td className="px-4 py-2.5 font-mono text-slate-600">
                                  {log.speed !== null && log.speed !== undefined ? `${log.speed.toFixed(1)} km/h` : "-"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

                {/* Right Area (1/3 width) - Verification & Billing */}
                <div className="lg:col-span-1 space-y-6">
                  
                  {/* Quantity Record card */}
                  <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                      <Truck className="h-4.5 w-4.5 text-indigo-650" />
                      <h4 className="text-sm font-bold text-slate-800">Verification Ledger</h4>
                    </div>

                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-semibold">Estimated Volume:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {quantity?.estimated_litres ? `${quantity.estimated_litres.toLocaleString()} L` : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-semibold">Driver Entered:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {quantity?.driver_entered_litres ? `${quantity.driver_entered_litres.toLocaleString()} L` : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 font-semibold">Hotel Confirmed:</span>
                        <span className={`font-mono font-bold ${
                          quantity?.hotel_confirmed_litres ? "text-indigo-650" : "text-amber-500 italic"
                        }`}>
                          {quantity?.hotel_confirmed_litres ? `${quantity.hotel_confirmed_litres.toLocaleString()} L` : "Pending Confirmation"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                        <span className="text-slate-900 font-bold">Final Collected:</span>
                        <span className="font-mono font-extrabold text-slate-950 text-sm">
                          {quantity?.collected_litres ? `${quantity.collected_litres.toLocaleString()} L` : "-"}
                        </span>
                      </div>
                      {quantity?.variance_litres !== null && quantity?.variance_litres !== undefined && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-semibold">Variance vs Estimate:</span>
                          <span className={`font-mono font-bold ${
                            quantity.variance_litres > 0 ? "text-red-500" : "text-green-600"
                          }`}>
                            {quantity.variance_litres > 0 ? `+${quantity.variance_litres}` : quantity.variance_litres} L
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity Confirmation Form */}
                  {showConfirmForm && (
                    <div className="bg-indigo-900 text-white p-5 rounded-2xl shadow-sm space-y-4">
                      <div>
                        <h4 className="text-sm font-black tracking-tight">Operator Verification</h4>
                        <p className="text-[10px] text-indigo-250 mt-0.5 font-medium leading-relaxed">
                          Confirm the wastewater litres collected by the driver below.
                        </p>
                      </div>

                      {confirmSuccess && (
                        <div className="bg-indigo-950/40 border border-indigo-500/20 text-indigo-200 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
                          <Check className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                          <span>Wastewater quantity confirmed!</span>
                        </div>
                      )}

                      <form onSubmit={handleConfirmQuantity} className="space-y-4 text-xs font-semibold">
                        <div>
                          <label className="block text-[9px] text-indigo-300 font-bold uppercase tracking-wider mb-1.5">
                            Confirmed Litres *
                          </label>
                          <input
                            type="number"
                            required
                            min={1}
                            placeholder="e.g. 1500"
                            value={hotelConfirmedLitres}
                            onChange={(e) => setHotelConfirmedLitres(e.target.value)}
                            className="block w-full px-3 py-2 bg-indigo-950/70 border border-indigo-800 rounded-xl text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] text-indigo-300 font-bold uppercase tracking-wider mb-1.5">
                            Variance Remarks
                          </label>
                          <textarea
                            rows={2}
                            placeholder="State reasons for differences, if any..."
                            value={varianceRemarks}
                            onChange={(e) => setVarianceRemarks(e.target.value)}
                            className="block w-full px-3 py-2 bg-indigo-950/70 border border-indigo-800 rounded-xl text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium leading-relaxed resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={confirmLoading}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-indigo-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {confirmLoading ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Verify Collected Litres"
                          )}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Payment and Pricing details */}
                  {payment && (
                    <div className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                        <HelpCircle className="h-4.5 w-4.5 text-indigo-650" />
                        <h4 className="text-sm font-bold text-slate-800">Billing details</h4>
                      </div>

                      <div className="space-y-3.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-semibold">Total Amount:</span>
                          <span className="font-mono font-bold text-slate-900">₹{payment.amount?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-semibold">Payment Mode:</span>
                          <span className="font-bold text-slate-700 capitalize">{payment.payment_mode?.replace("_", " ")}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-semibold">Payment Status:</span>
                          <StatusBadge status={payment.payment_status as any} />
                        </div>
                        {payment.transaction_id && (
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400 font-semibold">Transaction Reference:</span>
                            <span className="font-mono font-bold text-slate-650">{payment.transaction_id}</span>
                          </div>
                        )}
                      </div>
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
