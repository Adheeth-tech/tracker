"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

type TrailPoint = {
  lat: number;
  lng: number;
  status: string;
  ts: string;
};

type TripProgressMapProps = {
  trail: TrailPoint[];
  route?: {
    geometry?: { coordinates?: number[][] } | null;
    destination?: { name: string; latitude: number; longitude: number } | null;
  } | null;
  destination?: {
    name: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
};

const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export default function TripProgressMap({ trail, route, destination }: TripProgressMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const currentMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const mapLoadedRef = useRef(false);
  const hasFitBoundsRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !token) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [0, 0],
      zoom: 2,
      attributionControl: true,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);
    map.on("load", () => {
      mapLoadedRef.current = true;
      setMapReady(true);
      map.resize();
    });

    return () => {
      resizeObserver.disconnect();
      currentMarkerRef.current?.remove();
      destinationMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      mapLoadedRef.current = false;
      setMapReady(false);
      hasFitBoundsRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;

    const validTrail = trail.filter(
      (point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)
    ).reverse(); // API returns newest first; draw chronologically.
    const coordinates = validTrail.map((point) => [point.lng, point.lat] as [number, number]);
    const routeCoordinates = route?.geometry?.coordinates?.filter(
      (point) => point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1])
    ) || [];
    const destinationPoint = route?.destination
      ? [route.destination.longitude, route.destination.latitude] as [number, number]
      : destination?.latitude != null && destination.longitude != null
        ? [destination.longitude, destination.latitude] as [number, number]
        : null;

    const source = map.getSource("driver-progress") as mapboxgl.GeoJSONSource | undefined;
    const lineData = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
    } as any;

    if (source) {
      source.setData(lineData);
    } else {
      map.addSource("driver-progress", { type: "geojson", data: lineData });
      map.addLayer({
        id: "driver-progress-line",
        type: "line",
        source: "driver-progress",
        paint: {
          "line-color": "#4f46e5",
          "line-width": 5,
          "line-opacity": 0.85,
        },
      });
    }

    const routeSource = map.getSource("driver-directions") as mapboxgl.GeoJSONSource | undefined;
    const routeData = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: routeCoordinates },
    } as any;
    if (routeSource) {
      routeSource.setData(routeData);
    } else {
      map.addSource("driver-directions", { type: "geojson", data: routeData });
      map.addLayer({
        id: "driver-directions-line",
        type: "line",
        source: "driver-directions",
        paint: {
          "line-color": "#0ea5e9",
          "line-width": 5,
          "line-opacity": 0.8,
          "line-dasharray": [1, 1.5],
        },
      });
    }

    if (coordinates.length > 0) {
      const current = coordinates[coordinates.length - 1];
      if (!currentMarkerRef.current) {
        currentMarkerRef.current = new mapboxgl.Marker({ color: "#2563eb" })
          .setLngLat(current)
          .setPopup(new mapboxgl.Popup().setText("Driver's latest known position"))
          .addTo(map);
      } else {
        currentMarkerRef.current.setLngLat(current);
      }
    }

    if (destinationPoint) {
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = new mapboxgl.Marker({ color: "#7c3aed" })
          .setLngLat(destinationPoint)
          .setPopup(new mapboxgl.Popup().setText(destination.name))
          .addTo(map);
      } else {
        destinationMarkerRef.current.setLngLat(destinationPoint);
      }
    }

    // Fit once when the first GPS data arrives. Subsequent polling updates the
    // marker and line without repeatedly moving the hotel's viewport.
    if (!hasFitBoundsRef.current && (coordinates.length > 0 || routeCoordinates.length > 0 || destinationPoint)) {
      const bounds = new mapboxgl.LngLatBounds();
      coordinates.forEach((point) => bounds.extend(point));
      routeCoordinates.forEach(([lng, lat]) => bounds.extend([lng, lat]));
      if (destinationPoint) bounds.extend(destinationPoint);
      map.fitBounds(bounds, { padding: 55, maxZoom: 15, duration: 0 });
      hasFitBoundsRef.current = true;
    }
  }, [trail, route, destination, mapReady]);

  if (!token) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-xs font-semibold text-amber-800">
        Map tracking is unavailable because the Mapbox token is not configured.
      </div>
    );
  }

  return <div ref={containerRef} className="h-[420px] w-full overflow-hidden rounded-2xl" />;
}
