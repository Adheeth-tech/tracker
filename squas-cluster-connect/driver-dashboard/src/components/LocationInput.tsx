"use client";

import React, { useState } from "react";
import { MapPin, Navigation, AlertCircle } from "lucide-react";

interface LocationInputProps {
  latitude: string;
  longitude: string;
  onChange: (lat: string, lng: string) => void;
}

export default function LocationInput({
  latitude,
  longitude,
  onChange,
}: LocationInputProps) {
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const fetchBrowserLocation = () => {
    if (!navigator.geolocation) {
      setLocError("Geolocation is not supported by your browser.");
      return;
    }

    setLocLoading(true);
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        onChange(lat, lng);
        setLocLoading(false);
      },
      (error) => {
        console.warn("Geolocation access denied:", error);
        setLocError("Location access denied or unavailable. Please type manually.");
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  return (
    <div className="bg-slate-50 border border-gray-150 p-4 rounded-xl space-y-3.5 text-xs text-slate-800">
      <div className="flex justify-between items-center">
        <span className="font-bold flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-indigo-600" />
          Location Coordinates (Optional)
        </span>
        <button
          type="button"
          onClick={fetchBrowserLocation}
          disabled={locLoading}
          className="inline-flex items-center gap-1 bg-white border border-gray-250 hover:bg-gray-50 text-indigo-650 px-2.5 py-1 rounded font-bold cursor-pointer transition-colors shadow-sm disabled:opacity-50 text-[10px]"
        >
          <Navigation className={`h-3 w-3 ${locLoading ? "animate-pulse" : ""}`} />
          {locLoading ? "Locating..." : "Use My Location"}
        </button>
      </div>

      {locError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg flex items-start gap-1.5 text-[10px] font-semibold">
          <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <span>{locError}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3.5">
        <div>
          <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">
            Latitude
          </label>
          <input
            type="number"
            step="0.000001"
            placeholder="e.g. 10.528"
            value={latitude}
            onChange={(e) => onChange(e.target.value, longitude)}
            className="block w-full px-2.5 py-2.5 bg-white border border-gray-200 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs"
          />
        </div>
        <div>
          <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">
            Longitude
          </label>
          <input
            type="number"
            step="0.000001"
            placeholder="e.g. 76.215"
            value={longitude}
            onChange={(e) => onChange(latitude, e.target.value)}
            className="block w-full px-2.5 py-2.5 bg-white border border-gray-200 rounded-lg text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs"
          />
        </div>
      </div>
    </div>
  );
}
