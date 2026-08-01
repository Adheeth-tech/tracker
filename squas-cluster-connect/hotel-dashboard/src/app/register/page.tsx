"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../lib/api";
import LocationPicker from "../../components/LocationPicker";
import { Droplet, ArrowLeft, Send, CheckCircle, RefreshCw, MapPin, Navigation, AlertCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    hotel_name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    latitude: null as number | null,
    longitude: null as number | null,
    gst_number: "",
    tank_location: "",
    tank_capacity: 5000,
    usual_volume: 1500,
    usual_pickup_time: "08:00-10:00",
    payment_type: "monthly_invoice",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "latitude" || name === "longitude" || name === "tank_capacity" || name === "usual_volume"
        ? parseFloat(value) || 0
        : value,
    }));
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("This browser does not support location access.");
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        }));
        setLocationLoading(false);
      },
      () => {
        setLocationError("Location access was denied or unavailable. Enable location access and try again.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (formData.latitude === null || formData.longitude === null) {
      setErrorMsg("Capture the hotel location before submitting the registration.");
      return;
    }
    setLoading(true);

    try {
      await api.registerHotel(formData);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to register hotel. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-slate-950 to-indigo-950 px-4 py-8 relative overflow-hidden">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 -right-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>

        <div className="max-w-md w-full z-10">
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative text-center space-y-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/35">
              <CheckCircle className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white">Registration Submitted!</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your hotel hub <span className="text-white font-semibold">{formData.hotel_name}</span> is registered. 
                Your account status is currently <span className="text-amber-400 font-bold">PENDING</span> admin approval. Your phone login is available, but pickup requests remain locked until approval.
              </p>
            </div>

            <div className="bg-indigo-950/40 border border-indigo-500/20 p-4 rounded-2xl text-left text-xs text-indigo-300 leading-normal space-y-1.5">
              <p className="font-bold text-indigo-200">Next Steps:</p>
              <p>1. Go to the login screen and enter your phone number (<span className="text-white font-mono">{formData.phone}</span>).</p>
              <p>2. Complete verification using the access code.</p>
              <p>3. After admin approval, you can log in and raise wastewater pickup requests.</p>
            </div>

            <Link
              href="/login"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Go to Login Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-slate-950 to-indigo-950 px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10"></div>

      <div className="max-w-2xl w-full z-10">
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 rounded-xl">
                <Droplet className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white">Register Hotel Hub</h1>
                <p className="text-slate-400 text-xs mt-0.5">Wastewater fleet node enrollment</p>
              </div>
            </div>
            <Link
              href="/login"
              className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>

          {errorMsg && (
            <div className="bg-red-900/25 border border-red-500/30 text-red-300 p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0"></span>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Section 1: Basic Hotel Profile */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-l-2 border-indigo-500 pl-2">
                1. General Hotel Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1.5">
                    Hotel Name *
                  </label>
                  <input
                    type="text"
                    name="hotel_name"
                    required
                    value={formData.hotel_name}
                    onChange={handleChange}
                    placeholder="e.g. Orchard Luxury Inn"
                    className="block w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-650 focus:border-indigo-650 text-xs font-semibold transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1.5">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    name="contact_person"
                    required
                    value={formData.contact_person}
                    onChange={handleChange}
                    placeholder="e.g. Sam Thomas"
                    className="block w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-650 focus:border-indigo-650 text-xs font-semibold transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1.5">
                    Operator Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g. +919000000099"
                    className="block w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-650 focus:border-indigo-650 text-xs font-semibold transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. ops@orchard.example"
                    className="block w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-650 focus:border-indigo-650 text-xs font-semibold transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1.5">
                  Full Postal Address *
                </label>
                <textarea
                  name="address"
                  required
                  rows={2}
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g. Round North, Thrissur, Kerala"
                  className="block w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-650 focus:border-indigo-650 text-xs font-semibold transition-all resize-none"
                />
              </div>
            </div>

            {/* Section 2: Technical and Tank Details */}
            <div className="space-y-4 pt-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-l-2 border-indigo-500 pl-2">
                2. Technical & Tank Specifications
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1.5">
                    GST Number
                  </label>
                  <input
                    type="text"
                    name="gst_number"
                    value={formData.gst_number}
                    onChange={handleChange}
                    placeholder="32AAAAA1111A1Z1"
                    className="block w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-650 focus:border-indigo-650 text-xs font-semibold transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1.5">
                    Tank Capacity (Litres) *
                  </label>
                  <input
                    type="number"
                    name="tank_capacity"
                    required
                    min={0}
                    value={formData.tank_capacity}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-650 focus:border-indigo-650 text-xs font-semibold transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1.5">
                    Usual Volume (Litres) *
                  </label>
                  <input
                    type="number"
                    name="usual_volume"
                    required
                    min={0}
                    value={formData.usual_volume}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-650 focus:border-indigo-650 text-xs font-semibold transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1.5">
                    Physical Tank Location
                  </label>
                  <input
                    type="text"
                    name="tank_location"
                    value={formData.tank_location}
                    onChange={handleChange}
                    placeholder="e.g. Rear service yard near generator"
                    className="block w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-650 focus:border-indigo-650 text-xs font-semibold transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1.5">
                    Usual Time Window *
                  </label>
                  <input
                    type="text"
                    name="usual_pickup_time"
                    required
                    value={formData.usual_pickup_time}
                    onChange={handleChange}
                    placeholder="e.g. 08:00-10:00"
                    className="block w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-650 focus:border-indigo-650 text-xs font-semibold transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1.5">
                    Billing / Payment Mode *
                  </label>
                  <select
                    name="payment_type"
                    required
                    value={formData.payment_type}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-650 focus:border-indigo-650 text-xs font-semibold transition-all"
                  >
                    <option value="cash">Cash Pay</option>
                    <option value="upi">UPI Pay</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="credit">Credit Account</option>
                    <option value="monthly_invoice">Monthly Invoice</option>
                  </select>
                </div>

                <div className="md:col-span-2 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-350 uppercase tracking-wider mb-1.5">
                        Hotel Location *
                      </label>
                      <p className="text-[10px] text-slate-500">Use your device location or search and select the hotel on the map. No coordinate entry is required.</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={captureLocation}
                        disabled={locationLoading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/50 bg-indigo-950/50 px-3 py-2 text-[10px] font-bold text-indigo-200 hover:bg-indigo-900/60 disabled:opacity-50"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        {locationLoading ? "Locating..." : "Use Current Location"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLocationError(null); setShowLocationPicker(true); }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-bold text-white hover:bg-indigo-700"
                      >
                        <MapPin className="h-3.5 w-3.5" /> Pick on Map
                      </button>
                    </div>
                  </div>
                  {formData.latitude !== null && formData.longitude !== null && (
                    <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-950/60 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-300">
                      <MapPin className="h-3.5 w-3.5" /> Location selected and ready
                    </div>
                  )}
                  {locationError && (
                    <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-amber-800/60 bg-amber-950/30 p-2.5 text-[10px] font-semibold text-amber-300">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {locationError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Hotel Enrollment
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      {showLocationPicker && (
        <LocationPicker
          latitude={formData.latitude}
          longitude={formData.longitude}
          onSelect={(latitude, longitude, address) => {
            setFormData((prev) => ({
              ...prev,
              latitude: Number(latitude.toFixed(6)),
              longitude: Number(longitude.toFixed(6)),
              ...(address ? { address } : {}),
            }));
            setLocationError(null);
          }}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </div>
  );
}
