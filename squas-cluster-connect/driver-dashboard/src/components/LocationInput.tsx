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
        setLocError("Location access denied or unavailable. Enable browser location to attach the current position.");
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

      <p className="text-[10px] text-slate-500">
        {latitude && longitude
          ? "Current device location captured and ready to submit."
          : "Location is captured automatically from this device; no coordinate entry is required."}
      </p>
    </div>
  );
}
