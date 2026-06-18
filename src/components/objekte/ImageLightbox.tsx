"use client";

// Fokussierte Vollbild-Bildansicht (Lightbox). Klick auf ein Foto öffnet diese
// Ansicht; man kann alle Bilder per Pfeil/Klick/Tastatur nacheinander durchsehen.
// Business-Komposition (kein shadcn-Pendant) — eigenes Overlay mit a11y.

import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export interface LightboxImage {
  url: string;
  alt?: string | null;
}

export function ImageLightbox({
  images,
  index,
  onIndexChange,
  onClose,
}: {
  images: LightboxImage[];
  /** Aktuell sichtbarer Index, oder null = geschlossen. */
  index: number | null;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const open = index != null && index >= 0 && index < images.length;

  const go = useCallback(
    (dir: 1 | -1) => {
      if (index == null) return;
      const next = (index + dir + images.length) % images.length;
      onIndexChange(next);
    },
    [index, images.length, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    // Hintergrund-Scroll sperren, solange offen.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, go, onClose]);

  if (!open || index == null) return null;
  const current = images[index];

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/92 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Bildansicht"
    >
      {/* Top bar: counter + close */}
      <div className="flex items-center justify-between px-4 py-3 text-white/90 sm:px-6">
        <span className="text-sm font-medium tabular-nums">
          {index + 1} / {images.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Main image area */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-16">
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Vorheriges Bild"
            className="absolute left-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-4"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.url}
          src={current.url}
          alt={current.alt ?? `Bild ${index + 1}`}
          className="max-h-full max-w-full select-none object-contain animate-fade-in"
        />

        {images.length > 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Nächstes Bild"
            className="absolute right-2 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-4"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Thumbnail strip — alle Bilder nacheinander anklickbar */}
      {images.length > 1 && (
        <div className="flex justify-center gap-2 overflow-x-auto px-4 py-4 sm:px-6">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`Bild ${i + 1} anzeigen`}
              aria-current={i === index}
              className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                i === index
                  ? "border-brand-accent"
                  : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt ?? `Vorschau ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
