"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../lib/api";
import ProtectedRoute from "../../../components/ProtectedRoute";
import AppShell from "../../../components/AppShell";
import { useToast } from "../../../components/Toast";
import { ArrowLeft, Send, RefreshCw, AlertCircle } from "lucide-react";

const PICKUP_TIME_SLOTS = [
  "06:00-08:00",
  "08:00-10:00",
  "10:00-12:00",
  "12:00-14:00",
  "14:00-16:00",
  "16:00-18:00",
  "18:00-20:00",
];

export default function NewRequestPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form fields matching PickupRequestCreate
  const [formData, setFormData] = useState({
    requested_date: new Date().toISOString().split("T")[0],
    time_window: "08:00-10:00",
    estimated_litres: 1500,
    wastewater_type: "mixed",
    urgency: "normal",
    access_instructions: "",
    remarks: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "estimated_litres" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      await api.createRequest(formData);
      showToast("Pickup request submitted successfully.", "success");
      router.push("/requests");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to create pickup request.", "error");
      setErrorMsg(err.message || "Failed to create request. Please check inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header Row */}
          <div className="flex justify-between items-center border-b border-gray-150 pb-5">
            <div>
              <p className="text-xs text-gray-400 font-medium">Raise a decentralized wastewater collection request</p>
            </div>
            <Link
              href="/requests"
              className="text-xs font-bold text-gray-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to List
            </Link>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-750 p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Requested Date *
                </label>
                <input
                  type="date"
                  name="requested_date"
                  required
                  value={formData.requested_date}
                  onChange={handleChange}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Preferred Time Window *
                </label>
                <select
                  name="time_window"
                  required
                  value={formData.time_window}
                  onChange={handleChange}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 font-mono font-semibold"
                >
                  {PICKUP_TIME_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Estimated Litres *
                </label>
                <input
                  type="number"
                  name="estimated_litres"
                  required
                  min={1}
                  value={formData.estimated_litres}
                  onChange={handleChange}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Wastewater Type *
                </label>
                <select
                  name="wastewater_type"
                  required
                  value={formData.wastewater_type}
                  onChange={handleChange}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 font-semibold"
                >
                  <option value="greywater">Greywater (Sinks/Showers)</option>
                  <option value="kitchen">Kitchen/Grease Wastewater</option>
                  <option value="mixed">Mixed Wastewater</option>
                  <option value="blackwater">Blackwater (Toilets)</option>
                  <option value="other">Other Sludge</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Urgency Level *
                </label>
                <select
                  name="urgency"
                  required
                  value={formData.urgency}
                  onChange={handleChange}
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 font-semibold"
                >
                  <option value="normal">Normal (Scheduled)</option>
                  <option value="urgent">Urgency: Urgent</option>
                  <option value="high">Urgency: Critical</option>
                </select>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Driver Access Instructions
                </label>
                <textarea
                  name="access_instructions"
                  rows={2}
                  value={formData.access_instructions}
                  onChange={handleChange}
                  placeholder="e.g. Enter through the rear service yard, bypass main hotel reception door."
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 leading-relaxed resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Additional Operator Remarks
                </label>
                <textarea
                  name="remarks"
                  rows={2}
                  value={formData.remarks}
                  onChange={handleChange}
                  placeholder="e.g. Please send a tanker with at least 5000L capacity if possible."
                  className="block w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 leading-relaxed resize-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-indigo-650 hover:bg-indigo-750 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Pickup Request
                </>
              )}
            </button>

          </form>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
