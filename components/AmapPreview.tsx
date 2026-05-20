"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";
import { MapPinned } from "lucide-react";
import { useEffect, useRef } from "react";

export function AmapPreview({
  lat,
  lng,
  name,
  compact = false
}: {
  lat: number;
  lng: number;
  name: string;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderMap() {
      if (!ref.current) return;
      const L = await import("leaflet");
      if (cancelled || !ref.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(ref.current, {
          center: [lat, lng],
          zoom: 14,
          zoomControl: true,
          attributionControl: true
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(mapRef.current);
      }

      const map = mapRef.current;
      map.setView([lat, lng], 14);
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          layer.removeFrom(map);
        }
      });
      L.marker([lat, lng]).addTo(map).bindPopup(name);
      setTimeout(() => map.invalidateSize(), 0);
    }

    renderMap();

    return () => {
      cancelled = true;
    };
  }, [lat, lng, name]);

  return (
    <div className={`relative overflow-hidden bg-mint ${compact ? "min-h-72 lg:min-h-full" : "h-72 rounded-lg border border-ink/10"}`}>
      <div ref={ref} className="h-full min-h-72 w-full" />
      <div className="pointer-events-none absolute left-3 top-3 inline-flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-ink shadow-sm">
        <MapPinned className="h-4 w-4 text-jade" />
        OpenStreetMap
      </div>
    </div>
  );
}
