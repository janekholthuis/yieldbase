"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { MAPBOX_TOKEN, hasMapbox, geocodeAddressParts } from "@/lib/mapbox";
import { formatAddress } from "@/lib/objekt-format";

interface Props {
  adresse: string;
  stadt: string | null;
  plz: string | null;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function KarteTab({ adresse, stadt, plz }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasMapbox()) {
      setError(
        "Karte nicht verfügbar — es ist kein gültiger Mapbox-Token konfiguriert.",
      );
      return;
    }
    let cancelled = false;
    (async () => {
      const center = await geocodeAddressParts(adresse, plz, stadt);
      if (cancelled || !ref.current) return;
      if (!center) {
        setError("Adresse konnte nicht geokodiert werden.");
        return;
      }

      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: ref.current,
        // Light, restrained basemap — premium and serious, not the colourful default.
        style: "mapbox://styles/mapbox/light-v11",
        center,
        zoom: 12.5,
        attributionControl: false,
        // Don't hijack page scroll; require ctrl/⌘ + scroll to zoom.
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
      map.addControl(
        new mapboxgl.AttributionControl({ compact: true }),
        "bottom-right",
      );
      map.addControl(
        new mapboxgl.ScaleControl({ unit: "metric" }),
        "bottom-left",
      );

      // Restrained brand-coloured dot marker (no playful teardrop/pulse).
      const el = document.createElement("div");
      el.style.cssText =
        "width:16px;height:16px;border-radius:9999px;background:#B8893E;" +
        "border:3px solid #ffffff;box-shadow:0 1px 8px rgba(15,23,42,.45);cursor:pointer;";

      const label = formatAddress(adresse, plz, stadt);
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(center)
        .addTo(map);
      if (label) {
        marker.setPopup(
          new mapboxgl.Popup({ offset: 18, closeButton: false }).setHTML(
            `<div style="font-size:12px;font-weight:600;line-height:1.3;color:#0f172a">${escapeHtml(label)}</div>`,
          ),
        );
      }

      // Calm entrance: ease in to the property once the style is ready.
      map.once("load", () => {
        if (cancelled) return;
        map.flyTo({ center, zoom: 15.5, duration: 1400, essential: true });
      });
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [adresse, stadt, plz]);

  if (error) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        <AlertCircle className="mx-auto mb-2 h-6 w-6" />
        {error}
        <p className="mt-1 text-xs">{formatAddress(adresse, plz, stadt) || "—"}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div ref={ref} className="h-[440px] w-full bg-muted md:h-[540px]" />
      </Card>
      <p className="px-1 text-xs text-muted-foreground">
        {formatAddress(adresse, plz, stadt)}
      </p>
    </div>
  );
}
