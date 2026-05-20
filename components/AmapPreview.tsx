"use client";

import { useEffect, useRef, useState } from "react";
import { MapPinned } from "lucide-react";

declare global {
  interface Window {
    AMap?: {
      Map: new (el: HTMLElement, options: Record<string, unknown>) => unknown;
      Marker: new (options: Record<string, unknown>) => { setMap: (map: unknown) => void };
    };
  }
}

export function AmapPreview({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const key = process.env.NEXT_PUBLIC_AMAP_WEB_KEY;

  useEffect(() => {
    if (!key || !ref.current) return;

    const renderMap = () => {
      if (!ref.current || !window.AMap) return;
      const map = new window.AMap.Map(ref.current, {
        zoom: 14,
        center: [lng, lat],
        viewMode: "2D"
      });
      const marker = new window.AMap.Marker({ position: [lng, lat], title: name });
      marker.setMap(map);
      setLoaded(true);
    };

    if (window.AMap) {
      renderMap();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>("script[data-amap]");
    if (existing) {
      existing.addEventListener("load", renderMap, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}`;
    script.async = true;
    script.dataset.amap = "true";
    script.addEventListener("load", renderMap, { once: true });
    document.body.appendChild(script);
  }, [key, lat, lng, name]);

  return (
    <div className="relative h-72 overflow-hidden rounded-lg border border-ink/10 bg-mint">
      {key ? <div ref={ref} className="h-full w-full" /> : null}
      {!key || !loaded ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <MapPinned className="h-10 w-10 text-jade" />
          <div>
            <p className="text-base font-semibold">{name}</p>
            <p className="mt-1 text-sm text-ink/60">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
            {!key ? <p className="mt-3 text-xs text-ink/50">设置 NEXT_PUBLIC_AMAP_WEB_KEY 后显示高德地图</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
