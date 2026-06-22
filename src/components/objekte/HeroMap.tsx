"use client";

// Lightweight Mapbox map, lazy-geladen (next/dynamic) — so wird mapbox-gl (~250 KB)
// NICHT in den initialen Bundle der Projektseite gezogen, sondern erst wenn der
// „Lage"-Tab geöffnet wird. Fällt auf einen Adress-Platzhalter zurück, wenn kein
// gültiges Token konfiguriert ist oder die Geokodierung scheitert.
import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin } from "lucide-react";
import { MAPBOX_TOKEN, hasMapbox, geocodeAddressParts } from "@/lib/mapbox";

export function HeroMap({
  adresse,
  plz,
  stadt,
  label,
}: {
  adresse: string;
  plz: string | null;
  stadt: string | null;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!hasMapbox()) {
      setFailed(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const center = await geocodeAddressParts(adresse, plz, stadt);
      if (cancelled || !ref.current) return;
      if (!center) {
        setFailed(true);
        return;
      }
      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: ref.current,
        style: "mapbox://styles/mapbox/light-v11",
        center,
        zoom: 14.5,
        attributionControl: false,
        cooperativeGestures: true,
        locale: {
          "ScrollZoomBlocker.CtrlMessage": "Strg + Scrollen zum Zoomen",
          "ScrollZoomBlocker.CmdMessage": "⌘ + Scrollen zum Zoomen",
          "TouchPanBlocker.Message": "Mit zwei Fingern bewegen",
        },
      });
      mapRef.current = map;
      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right",
      );

      const el = document.createElement("div");
      el.style.cssText =
        "width:16px;height:16px;border-radius:9999px;background:#B8893E;" +
        "border:3px solid #ffffff;box-shadow:0 1px 8px rgba(15,23,42,.45);";
      new mapboxgl.Marker({ element: el }).setLngLat(center).addTo(map);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [adresse, plz, stadt]);

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-brand-subtle">
        <MapPin className="h-8 w-8" />
        <span className="px-4 text-center text-[12px] text-brand-muted">
          {label || "Karte nicht verfügbar"}
        </span>
      </div>
    );
  }
  return <div ref={ref} className="h-full w-full" />;
}
