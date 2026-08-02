"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { VehiclePosition, Hotel } from "../lib/types";

interface LiveMapProps {
  positions: VehiclePosition[];
  hotels: Hotel[];
  selectedVehicleId: number | null;
  onSelectVehicle: (id: number) => void;
  trail: { lat: number; lng: number; speed?: number | null; status: string; ts: string }[] | null;
  plannedRoute?: { type: string; coordinates: number[][] } | null;
}

const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

function markerElement(label: string, color: string, selected: boolean) {
  const element = document.createElement("div");
  element.className = "flex flex-col items-center cursor-pointer";
  element.innerHTML = `
    <div style="background:${color};border-color:${selected ? "#fff" : "rgba(15,23,42,.35)"};width:32px;height:32px;border-radius:9999px;border-width:3px;box-shadow:0 3px 10px rgba(15,23,42,.3);display:flex;align-items:center;justify-content:center;color:white;font-size:15px">●</div>
    <div style="margin-top:2px;background:#0f172a;color:#fff;padding:2px 5px;border-radius:4px;font:700 10px ui-monospace,monospace;white-space:nowrap">${label}</div>
  `;
  return element;
}

export default function LiveMap({
  positions,
  hotels,
  selectedVehicleId,
  onSelectVehicle,
  trail,
  plannedRoute,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const vehicleMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const hotelMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const lastViewportKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !token) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [76.2144, 10.5276],
      zoom: 8,
      attributionControl: true,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);
    const frame = window.requestAnimationFrame(() => map.resize());
    map.on("load", () => {
      map.resize();
      setMapReady(true);
    });

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(frame);
      vehicleMarkersRef.current.forEach((marker) => marker.remove());
      hotelMarkersRef.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
      setMapReady(false);
      lastViewportKeyRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    vehicleMarkersRef.current.forEach((marker) => marker.remove());
    hotelMarkersRef.current.forEach((marker) => marker.remove());

    const bounds = new mapboxgl.LngLatBounds();
    const vehiclePoints: [number, number][] = [];

    hotels.forEach((hotel) => {
      if (hotel.latitude == null || hotel.longitude == null) return;
      const point: [number, number] = [hotel.longitude, hotel.latitude];
      bounds.extend(point);
      const marker = new mapboxgl.Marker({ color: "#7c3aed" })
        .setLngLat(point)
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setHTML(`<strong>${hotel.hotel_name}</strong><br/>Hotel hub`))
        .addTo(map);
      hotelMarkersRef.current.push(marker);
    });

    positions.forEach((vehicle) => {
      if (vehicle.latitude == null || vehicle.longitude == null) return;
      const point: [number, number] = [vehicle.longitude, vehicle.latitude];
      vehiclePoints.push(point);
      bounds.extend(point);
      const color = vehicle.status === "on_trip"
        ? "#2563eb"
        : vehicle.status === "available"
          ? "#10b981"
          : vehicle.status === "maintenance"
            ? "#f59e0b"
            : "#64748b";
      const marker = new mapboxgl.Marker({
        element: markerElement(vehicle.vehicle_number, color, selectedVehicleId === vehicle.vehicle_id),
        anchor: "bottom",
      })
        .setLngLat(point)
        .setPopup(new mapboxgl.Popup({ offset: 28 }).setHTML(
          `<strong>${vehicle.vehicle_number}</strong><br/>Status: ${vehicle.status.replace("_", " ")}<br/>${vehicle.trip_id ? `Trip #${vehicle.trip_id}` : "No active trip"}`
        ))
        .addTo(map);
      marker.getElement().addEventListener("click", () => onSelectVehicle(vehicle.vehicle_id));
      vehicleMarkersRef.current.push(marker);
    });

    const trailCoordinates = (trail || [])
      .map((point) => [point.lng, point.lat] as [number, number])
      .reverse();
    const routeCoordinates = plannedRoute?.coordinates || [];

    const updateLine = (sourceId: string, layerId: string, coordinates: number[][], color: string, dasharray?: number[]) => {
      const data = {
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates },
      } as any;
      const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
      if (source) source.setData(data);
      else {
        map.addSource(sourceId, { type: "geojson", data });
        map.addLayer({ id: layerId, type: "line", source: sourceId, paint: {
          "line-color": color,
          "line-width": 5,
          "line-opacity": 0.8,
          ...(dasharray ? { "line-dasharray": dasharray } : {}),
        }});
      }
    };

    updateLine("admin-trail", "admin-trail-line", trailCoordinates, "#4f46e5", [1, 1.5]);
    updateLine("admin-route", "admin-route-line", routeCoordinates, "#0ea5e9", [2, 1]);
    trailCoordinates.forEach((point) => bounds.extend(point));
    routeCoordinates.forEach((point) => bounds.extend(point as [number, number]));

    const viewportKey = selectedVehicleId
      ? `${selectedVehicleId}:${trail?.length || 0}:${routeCoordinates.length}:${positions.find((v) => v.vehicle_id === selectedVehicleId)?.latitude || ""}`
      : `all:${hotels.map((hotel) => hotel.id).join(",")}:${positions.map((vehicle) => vehicle.vehicle_id).join(",")}`;
    if (!bounds.isEmpty() && lastViewportKeyRef.current !== viewportKey) {
      lastViewportKeyRef.current = viewportKey;
      if (selectedVehicleId && vehiclePoints.length === 1 && !trailCoordinates.length && !routeCoordinates.length) {
        map.flyTo({ center: vehiclePoints[0], zoom: 14, essential: true });
      } else {
        map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 0 });
      }
    }
  }, [positions, hotels, selectedVehicleId, trail, plannedRoute, mapReady, onSelectVehicle]);

  if (!token) {
    return <div className="h-[550px] flex items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-xs font-semibold text-amber-800">Mapbox is not configured. Set NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN and restart the admin dashboard.</div>;
  }

  return <div ref={containerRef} className="h-[550px] w-full overflow-hidden rounded-2xl border border-gray-150 shadow-inner" />;
}
