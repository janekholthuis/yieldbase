"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { StatRow } from "@/components/ui/stat-row";
import { FileUpload } from "@/components/dokumente/FileUpload";
import {
  recordObjektBild,
  deleteObjektBild,
  recordObjektDokument,
  deleteObjektDokument,
  listObjektDokumenteSignedUrls,
} from "@/lib/actions/dokumente";
import { sanitizeFilename } from "@/lib/kunden-dokumente";
import {
  STATUS_BADGE_CLASS,
  STATUS_LABELS,
  formatEUR,
  formatNumber,
  pricePerSqm,
} from "@/lib/objekt-format";
import {
  ArrowLeft,
  Building2,
  FileDown,
  FileText,
  MapPin,
  Presentation,
  Trash2,
  UserCheck,
} from "lucide-react";
import type {
  EinheitDetail,
  ObjektBild,
  ObjektDokument,
  ObjektListItem,
} from "@/lib/data/objekte";
import { CompletenessCard } from "@/components/objekte/CompletenessCard";
import { BankDatenCard } from "@/components/objekte/BankDatenCard";
import { KarteTab } from "@/components/objekte/KarteTab";
import { KundenPickerModal } from "@/components/objekte/KundenPickerModal";
import { ReservierungModal } from "@/components/reservierung/ReservierungModal";
import { KalkulationsTab } from "@/components/objekte/KalkulationsTab";
import { FinanziererPoolTab } from "@/components/objekte/FinanziererPoolTab";
import { ExposeModal } from "@/components/expose/ExposeModal";
import { useAuth } from "@/lib/auth-context";
import type { KalkulationsContext } from "@/lib/data/kalkulation-context";

const DOK_KAT_LABEL: Record<string, string> = {
  grundriss: "Grundriss",
  expose: "Exposé",
  energieausweis: "Energieausweis",
  teilungserklaerung: "Teilungserklärung",
  mietvertrag: "Mietvertrag",
  kaufvertrag: "Kaufvertrag",
  protokoll: "Protokoll",
  sonstiges: "Sonstiges",
};

export function EinheitDetailView({
  einheit,
  kalkContext,
}: {
  einheit: EinheitDetail;
  kalkContext: KalkulationsContext;
}) {
  const e = einheit;
  const router = useRouter();
  const { roles } = useAuth();
  const canManagePool = roles.includes("admin") || roles.includes("support");
  const ppsm = pricePerSqm(e.kaufpreis, e.wohnflaeche);
  const [exposeOpen, setExposeOpen] = useState(false);

  // Erste zugewiesene Kunde-ID für eine personalisierte Präsentation (optional).
  const praesentationKundeId =
    e.zuweisungen.find((z) => z.kunde_id)?.kunde_id ?? undefined;
  const praesentationHref = `/objekte/${e.einheit_id}/praesentation${
    praesentationKundeId ? `/${praesentationKundeId}` : ""
  }`;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4">
      {/* Back */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href={praesentationHref}>
              <Presentation className="h-4 w-4" /> Präsentation
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExposeOpen(true)}
          >
            <FileDown className="h-4 w-4" /> Exposé
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/objekte">Alle Objekte</Link>
          </Button>
        </div>
      </div>

      <ExposeModal
        open={exposeOpen}
        onOpenChange={setExposeOpen}
        einheit={e}
        defaults={kalkContext.defaults}
      />

      {/* Title block */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Wohnung {e.wohnungsnummer}
            {e.projekt_name && (
              <span className="text-muted-foreground"> · {e.projekt_name}</span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {[e.adresse, e.plz, e.stadt].filter(Boolean).join(", ") || "—"}
          </p>
        </div>
        <span
          className={`rounded-md px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_CLASS[e.status]}`}
        >
          {STATUS_LABELS[e.status]}
        </span>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <KeyStat label="Kaufpreis" value={formatEUR(e.kaufpreis)} />
        <KeyStat label="Miete (mtl.)" value={formatEUR(e.miete)} />
        <KeyStat label="Wohnfläche" value={formatNumber(e.wohnflaeche, " m²")} />
        <KeyStat label="Zimmer" value={formatNumber(e.zimmer)} />
        <KeyStat
          label="Mietrendite"
          value={formatNumber(e.mietrendite_brutto, " %")}
        />
        <KeyStat
          label="€/m²"
          value={ppsm != null ? formatEUR(Math.round(ppsm)) : "—"}
        />
      </div>

      <Tabs defaultValue="uebersicht">
        <TabsList className="flex-wrap">
          <TabsTrigger value="uebersicht">Übersicht</TabsTrigger>
          <TabsTrigger value="kalkulation">Kalkulation</TabsTrigger>
          <TabsTrigger value="bilder">Bilder</TabsTrigger>
          <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
          <TabsTrigger value="bankdaten">Bankdaten</TabsTrigger>
          <TabsTrigger value="karte">Karte</TabsTrigger>
          {canManagePool && (
            <TabsTrigger value="finanzierer-pool">Finanzierer-Pool</TabsTrigger>
          )}
        </TabsList>

        {/* Übersicht */}
        <TabsContent value="uebersicht" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <DetailsGrid einheit={e} ppsm={ppsm} />
              <GeschwisterCard geschwister={e.geschwister} />
            </div>

            <div className="space-y-4">
              <CompletenessCard einheit={e} />
              <ZuweisungenCard zuweisungen={e.zuweisungen} einheitId={e.einheit_id} />
            </div>
          </div>
        </TabsContent>

        {/* Kalkulation */}
        <TabsContent value="kalkulation" className="space-y-4">
          <KalkulationsTab einheit={e} kalkContext={kalkContext} />
        </TabsContent>

        {/* Bilder */}
        <TabsContent value="bilder" className="space-y-4">
          <BilderGallery
            bilder={e.bilder}
            dokumente={e.dokumente}
            einheitId={e.einheit_id}
            projektId={e.projekt_id}
          />
        </TabsContent>

        {/* Dokumente */}
        <TabsContent value="dokumente" className="space-y-4">
          <DokumenteList
            dokumente={e.dokumente}
            einheitId={e.einheit_id}
            projektId={e.projekt_id}
          />
        </TabsContent>

        {/* Bankdaten */}
        <TabsContent value="bankdaten" className="space-y-4">
          <BankDatenCard />
        </TabsContent>

        {/* Karte */}
        <TabsContent value="karte" className="space-y-4">
          <KarteTab adresse={e.adresse} plz={e.plz} stadt={e.stadt} />
        </TabsContent>

        {/* Finanzierer-Pool (admin/support only) */}
        {canManagePool && (
          <TabsContent value="finanzierer-pool" className="space-y-4">
            <FinanziererPoolTab projektId={e.projekt_id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function KeyStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-base font-semibold tabular-nums">{value}</div>
    </Card>
  );
}

function DetailsGrid({
  einheit: e,
  ppsm,
}: {
  einheit: EinheitDetail;
  ppsm: number | null;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-4 space-y-1.5">
        <h3 className="mb-2 font-semibold">Stammdaten</h3>
        <StatRow label="Adresse" value={e.adresse || "—"} />
        <StatRow label="PLZ" value={e.plz ?? "—"} />
        <StatRow label="Stadt" value={e.stadt ?? "—"} />
        <StatRow label="Bundesland" value={e.bundesland ?? "—"} />
        <StatRow label="Bauträger" value={e.bautraeger ?? "—"} />
        <StatRow label="Baujahr" value={e.baujahr ?? "—"} />
        <StatRow label="Etage" value={e.etage ?? "—"} />
        <StatRow label="Wohnfläche" value={formatNumber(e.wohnflaeche, " m²")} />
        <StatRow label="Zimmer" value={formatNumber(e.zimmer)} />
        <StatRow label="Balkon" value={e.balkon ? "Ja" : "Nein"} />
        <StatRow label="Keller" value={e.keller ? "Ja" : "Nein"} />
        <StatRow label="Aufzug" value={e.aufzug ? "Ja" : "Nein"} />
      </Card>

      <Card className="p-4 space-y-1.5">
        <h3 className="mb-2 font-semibold">Wirtschaftliche Daten</h3>
        <StatRow label="Kaufpreis" value={formatEUR(e.kaufpreis)} />
        <StatRow
          label="€/m²"
          value={ppsm != null ? formatEUR(Math.round(ppsm)) : "—"}
        />
        <StatRow
          label="Mietrendite (brutto)"
          value={formatNumber(e.mietrendite_brutto, " %")}
        />
        <StatRow
          label="Hausgeld umlagef."
          value={formatEUR(e.hausgeld_umlagefaehig)}
        />
        <StatRow
          label="Hausgeld nicht umlagef."
          value={formatEUR(e.hausgeld_nicht_umlagefaehig)}
        />
        <StatRow
          label="Instandhaltungsrücklage"
          value={formatEUR(e.instandhaltungsruecklage)}
        />
        <StatRow
          label="Grundstücksanteil"
          value={formatEUR(e.grundstueckswert_anteil)}
        />
        <StatRow label="AfA-Satz" value={formatNumber(e.afa_satz, " %")} />
        <StatRow label="Vermietet" value={e.vermietet ? "Ja" : "Nein"} />
        <StatRow label="Mietzins (mtl.)" value={formatEUR(e.miete)} />
        <StatRow label="Mietvertragsende" value={e.mietvertrag_ende ?? "—"} />
      </Card>
    </div>
  );
}

function GeschwisterCard({ geschwister }: { geschwister: ObjektListItem[] }) {
  if (geschwister.length === 0) return null;
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold">Weitere Einheiten in diesem Projekt</h3>
      </div>
      <div className="divide-y rounded-md border">
        {geschwister.map((g) => (
          <Link
            key={g.einheit_id}
            href={`/objekte/${g.einheit_id}`}
            className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted"
          >
            <span className="font-medium">Wohnung {g.wohnungsnummer}</span>
            <span className="text-muted-foreground">
              {formatNumber(g.wohnflaeche, " m²")} · {formatNumber(g.zimmer, " Zi")} ·{" "}
              {formatEUR(g.kaufpreis)}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-xs ${STATUS_BADGE_CLASS[g.status]}`}
            >
              {STATUS_LABELS[g.status]}
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

function ZuweisungenCard({
  zuweisungen,
  einheitId,
}: {
  zuweisungen: EinheitDetail["zuweisungen"];
  einheitId: string;
}) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [reserveKundeId, setReserveKundeId] = useState<string | null>(null);
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Zugewiesene Kunden</h3>
        <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
          Objekt zuweisen
        </Button>
      </div>
      <KundenPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        einheitId={einheitId}
        onAssigned={() => router.refresh()}
      />
      {reserveKundeId && (
        <ReservierungModal
          open={!!reserveKundeId}
          onOpenChange={(o) => !o && setReserveKundeId(null)}
          einheitId={einheitId}
          kundeId={reserveKundeId}
          onDone={() => {
            setReserveKundeId(null);
            router.refresh();
          }}
        />
      )}
      {zuweisungen.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch kein Kunde zugewiesen.</p>
      ) : (
        <div className="space-y-2">
          {zuweisungen.map((z) => {
            const name =
              `${z.kunde?.vorname ?? ""} ${z.kunde?.nachname ?? ""}`.trim() ||
              "Kunde";
            return (
              <div
                key={z.id}
                className="flex items-center gap-3 rounded-md border p-2"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {z.kunde?.email ?? "—"}
                  </div>
                </div>
                <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {z.status}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => setReserveKundeId(z.kunde_id)}
                >
                  Reservieren
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// Gallery ported from OLD APP BilderTab (lightbox + grundriss) with upload +
// delete wired to the objekt-bilder (public) bucket.
function BilderGallery({
  bilder,
  dokumente,
  einheitId,
  projektId,
}: {
  bilder: ObjektBild[];
  dokumente: ObjektDokument[];
  einheitId: string;
  projektId: string;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const grundriss = dokumente.filter((d) => d.kategorie === "grundriss");
  const maxSort = bilder.reduce((m, b) => Math.max(m, b.sort_order ?? 0), -1);

  async function handleDeleteBild(id: string) {
    setDeletingId(id);
    try {
      await deleteObjektBild({ id });
      toast.success("Bild gelöscht");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">Galerie ({bilder.length})</h3>
      </div>

      <FileUpload
        bucket="objekt-bilder"
        multiple
        acceptedMime={["image/jpeg", "image/png", "image/webp"]}
        accept="image/jpeg,image/png,image/webp"
        label="Bilder hierher ziehen oder klicken (JPG, PNG, WebP)"
        buildPath={({ id, file }) => {
          const ext = file.name.split(".").pop() ?? "jpg";
          return `${einheitId}/${id}.${ext}`;
        }}
        onUploaded={async (meta) => {
          if (!meta.publicUrl) throw new Error("Keine öffentliche URL erhalten");
          await recordObjektBild({
            einheitId,
            projektId,
            url: meta.publicUrl,
            alt: meta.dateiname,
            sortOrder: maxSort + 1,
          });
        }}
      />

      {bilder.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Noch keine Bilder vorhanden.
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {bilder.map((b, i) => (
            <div
              key={b.id}
              className="group relative aspect-square w-full overflow-hidden rounded-lg bg-muted"
            >
              <button
                onClick={() => setLightbox(i)}
                className="block h-full w-full"
                aria-label="Bild vergrößern"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.url}
                  alt={b.alt ?? "Bild"}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              </button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-1.5 top-1.5 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                disabled={deletingId === b.id}
                onClick={() => handleDeleteBild(b.id)}
                aria-label="Bild löschen"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {grundriss.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Grundriss</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {grundriss.map((g) => (
              <Card key={g.id} className="overflow-hidden">
                {g.url.toLowerCase().endsWith(".pdf") ? (
                  <iframe src={g.url} title={g.dateiname} className="h-[420px] w-full" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.url} alt={g.dateiname} className="w-full" />
                )}
                <div className="flex items-center gap-2 border-t p-2 text-sm">
                  <FileText className="h-4 w-4" /> {g.dateiname}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {lightbox != null && bilder[lightbox] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-label="Bildvorschau"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bilder[lightbox].url}
            alt={bilder[lightbox].alt ?? "Bild"}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            {lightbox + 1} / {bilder.length}
          </div>
        </div>
      )}
    </div>
  );
}

const DOK_KAT_OPTIONS: { value: string; label: string }[] = [
  { value: "grundriss", label: "Grundriss" },
  { value: "expose", label: "Exposé" },
  { value: "energieausweis", label: "Energieausweis" },
  { value: "teilungserklaerung", label: "Teilungserklärung" },
  { value: "mietvertrag", label: "Mietvertrag" },
  { value: "kaufvertrag", label: "Kaufvertrag" },
  { value: "protokoll_eigentuemerversammlung", label: "Protokoll Eigentümerversammlung" },
  { value: "wirtschaftsplan", label: "Wirtschaftsplan" },
  { value: "sonstiges", label: "Sonstiges" },
];

// Document list grouped by kategorie, with upload (objekt-dokumente, private),
// signed-URL open (resolved on click) and delete. Ported from OLD APP DokumenteTab.
function DokumenteList({
  dokumente,
  einheitId,
  projektId,
}: {
  dokumente: ObjektDokument[];
  einheitId: string;
  projektId: string;
}) {
  const [kategorie, setKategorie] = useState<string>("sonstiges");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const groups = new Map<string, ObjektDokument[]>();
  for (const d of dokumente) {
    const arr = groups.get(d.kategorie) ?? [];
    arr.push(d);
    groups.set(d.kategorie, arr);
  }

  async function handleOpen(d: ObjektDokument) {
    setOpeningId(d.id);
    try {
      // If the stored url is already an http link (legacy public URL), open it
      // directly; otherwise resolve a fresh signed URL (private bucket).
      if (/^https?:\/\//.test(d.url)) {
        window.open(d.url, "_blank", "noopener,noreferrer");
        return;
      }
      const urls = await listObjektDokumenteSignedUrls({ ids: [d.id] });
      const signed = urls[d.id];
      if (!signed) {
        toast.error("Link konnte nicht erzeugt werden");
        return;
      }
      window.open(signed, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Öffnen fehlgeschlagen");
    } finally {
      setOpeningId(null);
    }
  }

  async function handleDelete(d: ObjektDokument) {
    setDeletingId(d.id);
    try {
      await deleteObjektDokument({ id: d.id });
      toast.success("Dokument gelöscht");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Löschen fehlgeschlagen");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Dokumente ({dokumente.length})</h3>

      <Card className="space-y-3 p-4">
        <div className="max-w-xs space-y-1.5">
          <Label>Kategorie</Label>
          <Select value={kategorie} onValueChange={setKategorie}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DOK_KAT_OPTIONS.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <FileUpload
          bucket="objekt-dokumente"
          label="Dokument hierher ziehen oder klicken"
          buildPath={({ id, safeName }) =>
            `einheit/${einheitId}/${id}-${sanitizeFilename(safeName)}`
          }
          onUploaded={async (meta) => {
            await recordObjektDokument({
              einheitId,
              projektId: undefined,
              url: meta.storagePath,
              dateiname: meta.dateiname,
              kategorie: kategorie as never,
              mimeType: meta.mimeType,
              sizeBytes: meta.sizeBytes,
            });
          }}
        />
      </Card>

      {dokumente.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Keine Dokumente vorhanden.
        </Card>
      ) : (
        [...groups.entries()].map(([kat, items]) => (
          <Card key={kat} className="p-4 space-y-2">
            <h4 className="font-semibold">{DOK_KAT_LABEL[kat] ?? kat}</h4>
            <div className="divide-y">
              {items.map((d) => (
                <div key={d.id} className="flex items-center gap-3 py-2">
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{d.dateiname}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={openingId === d.id}
                    onClick={() => handleOpen(d)}
                  >
                    Öffnen
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={deletingId === d.id}
                    onClick={() => handleDelete(d)}
                    aria-label="Dokument löschen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

// STUB — OLD APP KarteTab renders a Mapbox map. Intentionally not ported.
// TODO(migration): Mapbox KarteTab.
function KarteStub({
  adresse,
  plz,
  stadt,
}: {
  adresse: string;
  plz: string | null;
  stadt: string | null;
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-2 p-10 text-center">
      <MapPin className="h-8 w-8 text-muted-foreground" />
      <h3 className="font-semibold">Karte folgt — Mapbox-Integration</h3>
      <p className="text-sm text-muted-foreground">
        {[adresse, plz, stadt].filter(Boolean).join(", ") || "—"}
      </p>
    </Card>
  );
}
