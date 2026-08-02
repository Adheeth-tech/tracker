"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { NavigationRoute } from "../lib/types";

type TrailPoint = { lat: number; lng: number; status: string; ts: string };

export default function TripMap({
  trail,
  route,
  destination,
}: {
  trail: TrailPoint[];
  route: NavigationRoute | null;
  destination?: { name: string; latitude?: number | null; longitude?: number | null } | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const currentMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [ready, setReady] = useState(false);
  const fittedRef = useRef(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    if (!containerRef.current || !token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [76.2144, 10.5276],
      zoom: 8,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(containerRef.current);
    map.on("load", () => { map.resize(); setReady(true); });
    return () => {
      observer.disconnect();
      currentMarkerRef.current?.remove();
      destinationMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setReady(false);
      fittedRef.current = false;
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const chronologicalTrail = trail.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)).reverse();
    const trailCoordinates = chronologicalTrail.map((point) => [point.lng, point.lat] as [number, number]);
    const routeCoordinates = route?.geometry?.coordinates || [];
    const destinationPoint = route?.destination
      ? [route.destination.longitude, route.destination.latitude] as [number, number]
      : destination?.latitude != null && destination.longitude != null
        ? [destination.longitude, destination.latitude] as [number, number]
        : null;

    const setLine = (sourceId: string, layerId: string, coordinates: number[][], color: string, dasharray: number[]) => {
      const data = { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } } as any;
      const source = map.getSource(sourceId) as mapboxgl.GeoJSONSource | undefined;
      if (source) source.setData(data);
      else {
        map.addSource(sourceId, { type: "geojson", data });
        map.addLayer({ id: layerId, type: "line", source: sourceId, paint: { "line-color": color, "line-width": 5, "line-opacity": 0.82, "line-dasharray": dasharray } });
      }
    };

    setLine("trip-trail", "trip-trail-line", trailCoordinates, "#4f46e5", [1, 1.5]);
    setLine("trip-route", "trip-route-line", routeCoordinates, "#0ea5e9", [2, 1]);

    if (trailCoordinates.length) {
      const current = trailCoordinates[trailCoordinates.length - 1];
      if (!currentMarkerRef.current) {
        currentMarkerRef.current = new mapboxgl.Marker({ color: "#2563eb" }).setLngLat(current).addTo(map);
      } else currentMarkerRef.current.setLngLat(current);
    }
    if (destinationPoint) {
      const name = route?.destination.name || destination?.name || "Destination";
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = new mapboxgl.Marker({ color: "#7c3aed" }).setLngLat(destinationPoint).setPopup(new mapboxgl.Popup().setText(name)).addTo(map);
      } else destinationMarkerRef.current.setLngLat(destinationPoint);
    }

    if (!fittedRef.current && (trailCoordinates.length || routeCoordinates.length || destinationPoint)) {
      const bounds = new mapboxgl.LngLatBounds();
      trailCoordinates.forEach((point) => bounds.extend(point));
      routeCoordinates.forEach((point) => bounds.extend(point as [number, number]));
      if (destinationPoint) bounds.extend(destinationPoint);
      map.fitBounds(bounds, { padding: 55, maxZoom: 15, duration: 0 });
      fittedRef.current = true;
    }
  }, [trail, route, destination, ready]);

  if (!token) return <div className="flex h-[420px] items-center justify-center rounded-2xl bg-amber-50 p-6 text-center text-xs font-semibold text-amber-800">Mapbox is not configured.</div>;
  return <div ref={containerRef} className="h-[420px] w-full overflow-hidden rounded-2xl" />;
}
