"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { AlertCircle, Check, Loader2, MapPin, Search, X } from "lucide-react";

type LocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onSelect: (latitude: number, longitude: number, address?: string) => void;
  onClose: () => void;
};

type SearchFeature = {
  id: string;
  place_name?: string;
  center?: [number, number];
  geometry?: { coordinates?: [number, number] };
};

const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export default function LocationPicker({ latitude, longitude, onSelect, onClose }: LocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(
    latitude !== null && longitude !== null ? [longitude, latitude] : null,
  );
  const [address, setAddress] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchFeature[]>([]);
  const [searching, setSearching] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reverseGeocode = async (lng: number, lat: number) => {
    if (!token) return;
    setReverseGeocoding(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${encodeURIComponent(token)}&limit=1`,
      );
      if (!response.ok) throw new Error("Unable to find an address for this location.");
      const data = await response.json();
      setAddress(data.features?.[0]?.place_name || "");
    } catch {
      setAddress("");
    } finally {
      setReverseGeocoding(false);
    }
  };

  const setPoint = (point: [number, number], placeName?: string) => {
    setCoordinates(point);
    setAddress(placeName || "");
    setResults([]);
    if (mapRef.current) {
      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({ color: "#6366f1", draggable: true })
          .setLngLat(point)
          .addTo(mapRef.current);
        markerRef.current.on("dragend", () => {
          const position = markerRef.current?.getLngLat();
          if (!position) return;
          const next: [number, number] = [position.lng, position.lat];
          setCoordinates(next);
          reverseGeocode(position.lng, position.lat);
        });
      } else {
        markerRef.current.setLngLat(point);
      }
      mapRef.current.flyTo({ center: point, zoom: 14, essential: true });
    }
    if (!placeName) reverseGeocode(point[0], point[1]);
  };

  useEffect(() => {
    if (!mapContainer.current || !token) return;
    mapboxgl.accessToken = token;
    const initialPoint: [number, number] = latitude !== null && longitude !== null
      ? [longitude, latitude]
      : [0, 0];
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: initialPoint,
      zoom: latitude !== null && longitude !== null ? 14 : 1.5,
      attributionControl: true,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    map.on("load", () => {
      if (coordinates) setPoint(coordinates, address || undefined);
      map.resize();
    });
    map.on("click", (event) => setPoint([event.lngLat.lng, event.lngLat.lat]));
    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // The picker creates one map instance per open modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!token || query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json?access_token=${encodeURIComponent(token)}&autocomplete=true&limit=5`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Search is unavailable right now.");
        const data = await response.json();
        setResults(data.features || []);
      } catch (err: any) {
        if (err.name !== "AbortError") setError(err.message || "Search failed.");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const chooseResult = (feature: SearchFeature) => {
    const point = feature.center || feature.geometry?.coordinates;
    if (point) setPoint(point, feature.place_name);
    setQuery(feature.place_name || "");
  };

  const confirm = () => {
    if (!coordinates) {
      setError("Search for a place or click the map to choose the hotel location.");
      return;
    }
    onSelect(coordinates[1], coordinates[0], address);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex h-[min(720px,90vh)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-white"><MapPin className="h-4 w-4 text-indigo-400" />Choose hotel location</h2>
            <p className="mt-1 text-[11px] text-slate-400">Search for the hotel, click the map, or drag the pin to refine it.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close map"><X className="h-4 w-4" /></button>
        </div>

        {!token ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <div className="max-w-md rounded-xl border border-amber-800/60 bg-amber-950/30 p-5 text-amber-200">
              <AlertCircle className="mx-auto mb-3 h-6 w-6" />
              <p className="text-sm font-bold">Mapbox is not configured</p>
              <p className="mt-2 text-xs text-amber-300/80">Add NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN to the hotel dashboard .env.local file and restart the frontend.</p>
            </div>
          </div>
        ) : (
          <div className="relative min-h-0 flex-1">
            <div className="absolute left-4 right-4 top-4 z-10">
              <div className="relative max-w-xl">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search hotel, street, city, or landmark" className="w-full rounded-xl border border-slate-600 bg-slate-900/95 py-2.5 pl-10 pr-10 text-xs font-semibold text-white shadow-xl outline-none ring-indigo-500 placeholder:text-slate-500 focus:ring-2" />
                {searching && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-indigo-400" />}
                {results.length > 0 && <div className="mt-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-900/95 shadow-xl">{results.map((result) => <button type="button" key={result.id} onClick={() => chooseResult(result)} className="block w-full border-b border-slate-800 px-4 py-3 text-left text-xs text-slate-200 last:border-0 hover:bg-slate-800">{result.place_name}</button>)}</div>}
              </div>
            </div>
            <div ref={mapContainer} className="h-full min-h-[360px] w-full" />
            {error && <div className="absolute bottom-4 left-4 rounded-lg border border-red-700/60 bg-red-950/90 px-3 py-2 text-xs font-semibold text-red-200">{error}</div>}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-5 py-4">
          <div className="text-[10px] text-slate-400">{coordinates ? `${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}${reverseGeocoding ? " · finding address..." : address ? ` · ${address}` : ""}` : "No location selected"}</div>
          <div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800">Cancel</button><button type="button" onClick={confirm} disabled={!token || !coordinates} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"><Check className="h-3.5 w-3.5" />Confirm Location</button></div>
        </div>
      </div>
    </div>
  );
}
