"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { VehiclePosition, Hotel } from "../lib/types";

// Types for the component props
interface LiveMapProps {
  positions: VehiclePosition[];
  hotels: Hotel[];
  selectedVehicleId: number | null;
  onSelectVehicle: (id: number) => void;
  trail: { lat: number; lng: number; speed?: number | null; status: string; ts: string }[] | null;
}

export default function LiveMap({
  positions,
  hotels,
  selectedVehicleId,
  onSelectVehicle,
  trail,
}: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Layer groups to easily clear and update markers/polylines
  const vehicleLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const hotelLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const trailLayerGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create Leaflet map centered at Thrissur, Kerala by default
    const map = L.map(mapContainerRef.current, {
      center: [10.528, 76.215],
      zoom: 13,
      zoomControl: false, // will add in bottom-right for clean UI
    });

    mapRef.current = map;

    // Add zoom control at bottom right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Use CartoDB Positron sleek tiles (modern, minimalist, light style)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
    }).addTo(map);

    // Initialize layer groups and add to map
    vehicleLayerGroupRef.current = L.layerGroup().addTo(map);
    hotelLayerGroupRef.current = L.layerGroup().addTo(map);
    trailLayerGroupRef.current = L.layerGroup().addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update Markers and Trails dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const vehicleGroup = vehicleLayerGroupRef.current;
    const hotelGroup = hotelLayerGroupRef.current;
    const trailGroup = trailLayerGroupRef.current;

    if (!vehicleGroup || !hotelGroup || !trailGroup) return;

    // Clear old markers/polylines
    vehicleGroup.clearLayers();
    hotelGroup.clearLayers();
    trailGroup.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    // --- RENDER HOTELS ---
    hotels.forEach((hotel) => {
      if (hotel.latitude !== null && hotel.latitude !== undefined &&
          hotel.longitude !== null && hotel.longitude !== undefined) {
        const hotelCoords: [number, number] = [hotel.latitude, hotel.longitude];
        bounds.push(hotelCoords);

        // Custom Purple Hotel pin
        const hotelIcon = L.divIcon({
          html: `
            <div class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-indigo-700 bg-indigo-600 text-white shadow-md shadow-indigo-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </div>
          `,
          className: "custom-hotel-icon",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker(hotelCoords, { icon: hotelIcon })
          .bindPopup(`
            <div class="p-2 space-y-1 text-slate-800 font-sans">
              <h4 class="font-bold text-sm text-indigo-700">${hotel.hotel_name}</h4>
              <p class="text-xs text-slate-500 font-medium">${hotel.address || "Thrissur, Kerala"}</p>
              <div class="flex items-center gap-1.5 mt-2">
                <span class="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold border border-indigo-100">Hotel Hub</span>
                <span class="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">${hotel.contact_person || "Contact Person"}</span>
              </div>
            </div>
          `);
        hotelGroup.addLayer(marker);
      }
    });

    // --- RENDER VEHICLES ---
    positions.forEach((vehicle) => {
      if (vehicle.latitude !== null && vehicle.latitude !== undefined &&
          vehicle.longitude !== null && vehicle.longitude !== undefined) {
        const vehicleCoords: [number, number] = [vehicle.latitude, vehicle.longitude];
        bounds.push(vehicleCoords);

        // Map status to Tailwind colors
        let statusColor = "bg-slate-400 border-slate-500 shadow-slate-100 text-white";
        if (vehicle.status === "available") {
          statusColor = "bg-emerald-500 border-emerald-600 shadow-emerald-200 text-white";
        } else if (vehicle.status === "on_trip") {
          statusColor = "bg-blue-600 border-blue-700 shadow-blue-200 text-white";
        } else if (vehicle.status === "maintenance") {
          statusColor = "bg-amber-500 border-amber-600 shadow-amber-200 text-white";
        }

        // Custom HTML vehicle icon
        const vehicleIcon = L.divIcon({
          html: `
            <div class="relative flex flex-col items-center">
              <div class="flex items-center justify-center w-8 h-8 rounded-full border-2 shadow-lg ${statusColor} transition-transform hover:scale-110">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M19 18h2a1 1 0 0 0 1-1v-5.5a1.5 1.5 0 0 0-.5-1.1L18 7.5a1.5 1.5 0 0 0-1.1-.5H14"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
              </div>
              <div class="absolute -bottom-6 bg-slate-900 text-[10px] text-white px-1.5 py-0.5 rounded font-mono font-bold whitespace-nowrap border border-slate-700 shadow-md">
                ${vehicle.vehicle_number}
              </div>
            </div>
          `,
          className: "custom-vehicle-icon",
          iconSize: [32, 42],
          iconAnchor: [16, 21],
        });

        const isSelected = selectedVehicleId === vehicle.vehicle_id;

        const marker = L.marker(vehicleCoords, { icon: vehicleIcon });
        
        // Popup details
        marker.bindPopup(`
          <div class="p-2.5 space-y-1.5 text-slate-800 font-sans min-w-[200px]">
            <div class="flex justify-between items-center gap-4">
              <h4 class="font-bold text-sm text-slate-950 font-mono">${vehicle.vehicle_number}</h4>
              <span class="text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                vehicle.status === "available"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : vehicle.status === "on_trip"
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }">${vehicle.status.toUpperCase()}</span>
            </div>
            <p class="text-xs text-slate-500 font-semibold">Active Trip: <span class="font-bold text-slate-700">${
              vehicle.trip_id ? `#${vehicle.trip_id}` : "None"
            }</span></p>
            <p class="text-[10px] text-slate-400 font-mono mt-1">Coords: ${vehicle.latitude.toFixed(5)}, ${vehicle.longitude.toFixed(5)}</p>
          </div>
        `);

        // Click handler to select vehicle
        marker.on("click", () => {
          onSelectVehicle(vehicle.vehicle_id);
        });

        vehicleGroup.addLayer(marker);

        // If selected, auto open popup
        if (isSelected) {
          setTimeout(() => {
            marker.openPopup();
          }, 100);
        }
      }
    });

    // --- RENDER SELECTED TRIP TRAIL ---
    if (trail && trail.length > 0) {
      const trailCoords = trail
        .map((t) => [t.lat, t.lng] as [number, number])
        .reverse(); // backend orders logs desc, we need asc for drawing line sequential

      // Draw Indigo Polyline
      const polyline = L.polyline(trailCoords, {
        color: "#4f46e5",
        weight: 5,
        opacity: 0.8,
        lineJoin: "round",
        dashArray: "8, 12",
      });

      trailGroup.addLayer(polyline);

      // Draw Start / End / Current Position Markers on the Trail
      if (trailCoords.length > 0) {
        // Start position
        const startIcon = L.divIcon({
          html: `<div class="w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-white shadow-md"></div>`,
          className: "trail-start-marker",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        trailGroup.addLayer(L.marker(trailCoords[0], { icon: startIcon }));

        // Current/Latest Position (if not matching vehicle position directly)
        const currentIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              <span class="absolute inline-flex h-6 w-6 rounded-full bg-indigo-400 opacity-60 animate-ping"></span>
              <div class="w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-lg z-10"></div>
            </div>
          `,
          className: "trail-current-marker",
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        trailGroup.addLayer(L.marker(trailCoords[trailCoords.length - 1], { icon: currentIcon }));
      }

      // Fit map view bounds around the trail polyline
      const trailBounds = L.latLngBounds(trailCoords);
      map.fitBounds(trailBounds, { padding: [40, 40] });
    } else if (selectedVehicleId) {
      // If a vehicle is selected but has no trail, center map on that vehicle
      const focusedVehicle = positions.find((v) => v.vehicle_id === selectedVehicleId);
      if (
        focusedVehicle &&
        focusedVehicle.latitude !== null &&
        focusedVehicle.latitude !== undefined &&
        focusedVehicle.longitude !== null &&
        focusedVehicle.longitude !== undefined
      ) {
        map.setView([focusedVehicle.latitude, focusedVehicle.longitude], 15);
      }
    } else if (bounds.length > 0) {
      // If nothing is selected, fit map bounds to show all markers
      map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
    }
  }, [positions, hotels, selectedVehicleId, trail]);

  return (
    <div
      ref={mapContainerRef}
      className="h-[550px] w-full rounded-2xl overflow-hidden shadow-inner border border-gray-150 z-10"
      style={{ minHeight: "550px" }}
    />
  );
}
