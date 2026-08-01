"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { AlertCircle, LocateFixed, MapPin, RefreshCw, Volume2 } from "lucide-react";
import { api } from "../lib/api";
import { NavigationRoute, Trip } from "../lib/types";

type NavigationPanelProps = {
  trip: Trip;
  latitude: string;
  longitude: string;
};

const ACTIVE_STATUSES = new Set([
  "driver_started",
  "reached_hotel",
  "collection_started",
  "collection_completed",
  "moving_to_plant",
  "reached_plant",
  "unloaded",
]);

export default function NavigationPanel({ trip, latitude, longitude }: NavigationPanelProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const positionRef = useRef<{ lat: number; lng: number } | null>(null);
  const [route, setRoute] = useState<NavigationRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const currentPosition = useMemo(() => {
    if (!latitude.trim() || !longitude.trim()) return null;
    const lat = Number(latitude);
    const lng = Number(longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
      !(lat === 0 && lng === 0)
      ? { lat, lng }
      : null;
  }, [latitude, longitude]);

  useEffect(() => {
    positionRef.current = currentPosition;
  }, [currentPosition]);

  const loadRoute = async () => {
    const origin = positionRef.current;
    if (!origin) {
      setError("Waiting for a valid GPS position before calculating a route.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setRoute(await api.getNavigationRoute(trip.id, origin.lat, origin.lng));
    } catch (err: any) {
      setError(err.message || "Unable to calculate a road route.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !mapboxToken) return;
    mapboxgl.accessToken = mapboxToken;
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: currentPosition ? [currentPosition.lng, currentPosition.lat] : [76.215, 10.528],
      zoom: 14,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    return () => {
      markerRef.current?.remove();
      destinationMarkerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !currentPosition) return;
    const point: [number, number] = [currentPosition.lng, currentPosition.lat];
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ color: "#2563eb" }).setLngLat(point).addTo(map);
    } else {
      markerRef.current.setLngLat(point);
    }
  }, [currentPosition]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !route) return;
    const draw = () => {
      const source = map.getSource("navigation-route") as mapboxgl.GeoJSONSource | undefined;
      const data = { type: "Feature", properties: {}, geometry: route.geometry } as GeoJSON.Feature;
      if (source) {
        source.setData(data);
      } else {
        map.addSource("navigation-route", { type: "geojson", data });
        map.addLayer({
          id: "navigation-route-line",
          type: "line",
          source: "navigation-route",
          paint: { "line-color": "#4f46e5", "line-width": 6, "line-opacity": 0.85 },
        });
      }
      destinationMarkerRef.current?.remove();
      destinationMarkerRef.current = new mapboxgl.Marker({ color: "#dc2626" })
        .setLngLat([route.destination.longitude, route.destination.latitude])
        .setPopup(new mapboxgl.Popup().setText(route.destination.name))
        .addTo(map);
      const bounds = new mapboxgl.LngLatBounds();
      route.geometry.coordinates.forEach(([lng, lat]) => bounds.extend([lng, lat]));
      map.fitBounds(bounds, { padding: 50, maxZoom: 16 });
    };
    if (map.isStyleLoaded()) draw();
    else map.once("load", draw);
  }, [route]);

  useEffect(() => {
    if (!ACTIVE_STATUSES.has(trip.status)) return;
    setRoute(null);
  }, [trip.id, trip.status]);

  useEffect(() => {
    if (!ACTIVE_STATUSES.has(trip.status) || !currentPosition || route) return;
    loadRoute();
  }, [trip.id, trip.status, currentPosition, route]);

  useEffect(() => {
    if (!ACTIVE_STATUSES.has(trip.status)) return;
    const refresh = window.setInterval(loadRoute, 60000);
    return () => window.clearInterval(refresh);
  }, [trip.id, trip.status]);

  useEffect(() => {
    if (!ACTIVE_STATUSES.has(trip.status) || !("wakeLock" in navigator)) return;
    navigator.wakeLock.request("screen").then((lock) => { wakeLockRef.current = lock; }).catch(() => undefined);
    return () => { wakeLockRef.current?.release().catch(() => undefined); wakeLockRef.current = null; };
  }, [trip.status]);

  const nextStep = route?.steps.find((step) => step.instruction) || route?.steps[0];

  const speakNextStep = () => {
    if (!nextStep?.instruction || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(nextStep.instruction));
    setVoiceEnabled(true);
  };

  if (!ACTIVE_STATUSES.has(trip.status)) return null;

  return (
    <section className="bg-white border border-gray-150 rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Road navigation</p>
          <h4 className="text-sm font-bold text-slate-800">{route?.destination.name || "Calculating destination..."}</h4>
        </div>
        <button onClick={loadRoute} disabled={loading} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50" title="Recalculate route">
          <RefreshCw className={`h-4 w-4 text-indigo-600 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {!mapboxToken && <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">Set `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` in the driver dashboard environment to enable the map.</div>}
      {error && <div className="flex gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}

      <div ref={mapContainerRef} className="h-80 rounded-xl overflow-hidden bg-slate-100" />

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[9px] text-gray-400 font-bold uppercase">Distance</span>
          <p className="font-bold text-slate-800 mt-1">{route ? `${(route.distance_meters / 1000).toFixed(1)} km` : "—"}</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-[9px] text-gray-400 font-bold uppercase">ETA</span>
          <p className="font-bold text-slate-800 mt-1">{route ? `${Math.ceil(route.duration_seconds / 60)} min` : "—"}</p>
        </div>
      </div>

      {nextStep?.instruction && <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs font-semibold text-indigo-900"><div className="flex gap-2"><LocateFixed className="h-4 w-4 shrink-0" />{nextStep.instruction}</div><button onClick={speakNextStep} className="p-2 rounded-lg bg-white border border-indigo-200" title="Speak next instruction"><Volume2 className={`h-4 w-4 ${voiceEnabled ? "text-indigo-700" : "text-gray-500"}`} /></button></div>}
      {route && <div className="flex items-center gap-2 text-[10px] text-gray-500"><MapPin className="h-3.5 w-3.5" />Follow the road route and confirm arrival using the trip status controls.</div>}
    </section>
  );
}
