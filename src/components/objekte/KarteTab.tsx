"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Card } from "@/components/ui/card";
import { MapPin, AlertCircle } from "lucide-react";
import { MAPBOX_TOKEN, hasMapbox, geocodeAddressParts } from "@/lib/mapbox";

interface Props {
  adresse: string;
  stadt: string | null;
  plz: string | null;
}

export function KarteTab({ adresse, stadt, plz }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasMapbox()) {
      setError("Karte nicht verfügbar — Mapbox-Token fehlt.");
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
        style: "mapbox://styles/mapbox/streets-v12",
        center,
        zoom: 15,
      });
      mapRef.current = map;
      map.addControl(new mapboxgl.NavigationControl(), "top-right");
      new mapboxgl.Marker({ color: "#B8893E" }).setLngLat(center).addTo(map);
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
        <p className="mt-1 text-xs">
          {[adresse, plz, stadt].filter(Boolean).join(", ") || "—"}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <div ref={ref} className="h-[480px] w-full bg-muted" />
      </Card>
      <Card className="p-4">
        <h3 className="mb-1 flex items-center gap-2 font-semibold">
          <MapPin className="h-4 w-4" /> Standort-Highlights
        </h3>
        <p className="text-sm text-muted-foreground">
          ÖPNV, Schulen und Versorgung folgen mit dem KI-Standort-Modul (Phase
          2).
        </p>
      </Card>
    </div>
  );
}
