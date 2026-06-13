"use client";

// Visual hero gallery for the project detail page: one large lead image + a
// thumbnail grid with an "Alle anzeigen" overlay, plus a lightbox. Mirrors the
// rich object presentation so the key visuals live on the project page itself.
import { useState } from "react";
import { Building2, X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ObjektBild } from "@/lib/data/objekte";

export function ProjektGalerie({
  bilder,
  alt,
}: {
  bilder: ObjektBild[];
  alt: string;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (bilder.length === 0) {
    return (
      <div className="flex h-72 w-full items-center justify-center rounded-xl border bg-muted text-muted-foreground md:h-full">
        <Building2 className="h-12 w-12" />
      </div>
    );
  }

  const lead = bilder[0];
  const thumbs = bilder.slice(1, 5);
  const extra = bilder.length - 5;

  const open = (i: number) => setLightbox(i);
  const close = () => setLightbox(null);
  const step = (d: number) =>
    setLightbox((i) =>
      i == null ? i : (i + d + bilder.length) % bilder.length,
    );

  return (
    <>
      <div className="grid h-72 grid-cols-1 gap-2 md:h-[380px] md:grid-cols-[2fr_1fr]">
        {/* Lead image */}
        <button
          type="button"
          onClick={() => open(0)}
          className="group relative h-full w-full overflow-hidden rounded-xl bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lead.url}
            alt={lead.alt ?? alt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </button>

        {/* Thumbnail grid — min-h-0 verhindert, dass die Bildzeilen über die
            380px-Spur hinauswachsen und ins Hero/Kennzahlen überlappen. */}
        {thumbs.length > 0 && (
          <div className="hidden h-full min-h-0 grid-cols-2 grid-rows-2 gap-2 md:grid">
            {thumbs.map((b, idx) => {
              const realIdx = idx + 1;
              const isLast = idx === thumbs.length - 1 && extra > 0;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => open(realIdx)}
                  className="group relative h-full w-full overflow-hidden rounded-xl bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.url}
                    alt={b.alt ?? alt}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  {isLast && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white">
                      +{extra + 1} Fotos
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {lightbox != null && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          onClick={close}
        >
          <button
            className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={close}
            aria-label="Schließen"
          >
            <X className="h-5 w-5" />
          </button>
          {bilder.length > 1 && (
            <>
              <button
                className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="Vorheriges Bild"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="Nächstes Bild"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bilder[lightbox].url}
            alt={bilder[lightbox].alt ?? alt}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
            {lightbox + 1} / {bilder.length}
          </div>
        </div>
      )}
    </>
  );
}
