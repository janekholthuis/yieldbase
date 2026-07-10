import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProjektDetail, getEinheitDetail } from "@/lib/data/objekte";
import { getKalkulationsContext } from "@/lib/data/kalkulation-context";
import { Button } from "@/components/ui/button";
import { ProjektDetailView } from "@/components/objekte/ProjektDetailView";

export const metadata = {
  title: "Projekt-Detail · Erfolg mit Immobilien",
};

export default async function ProjektDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projektId: string }>;
  searchParams: Promise<{ einheit?: string | string[] }>;
}) {
  const { projektId } = await params;
  const sp = await searchParams;
  const initialEinheitId = Array.isArray(sp.einheit) ? sp.einheit[0] : sp.einheit;
  // When the URL deep-links a specific unit (`?einheit=`, e.g. a shared
  // presentation link), fetch its full detail in parallel with the project so the
  // externally-shared path has no waterfall. Without a deep-link we must wait for
  // the project to know which unit is first (handled below).
  const [{ projekt, error }, kalkContext, deepLinkDetailRes] = await Promise.all([
    getProjektDetail(projektId),
    getKalkulationsContext(),
    initialEinheitId ? getEinheitDetail(initialEinheitId) : Promise.resolve(null),
  ]);

  if (error || !projekt) {
    return (
      <div className="container mx-auto space-y-4 p-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/objekte">
            <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
          </Link>
        </Button>
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error ?? "Projekt nicht gefunden"}
        </div>
      </div>
    );
  }

  // Pre-load the initially selected unit's full detail server-side so the hero's
  // price/investment card + wealth chart render immediately — no client-side
  // fetch (and no skeleton hang under DB contention) for the default view.
  // Reuse the parallel deep-link fetch when it resolved to a unit that actually
  // belongs to this project; otherwise fall back to the project's first unit.
  const deepLinkValid =
    !!deepLinkDetailRes?.einheit &&
    projekt.einheiten.some((u) => u.einheit_id === initialEinheitId);
  let initialDetail = deepLinkValid ? (deepLinkDetailRes!.einheit ?? null) : null;
  if (!initialDetail) {
    const firstId = projekt.einheiten[0]?.einheit_id ?? null;
    initialDetail = firstId ? (await getEinheitDetail(firstId)).einheit : null;
  }

  return (
    <ProjektDetailView
      projekt={projekt}
      kalkContext={kalkContext}
      initialEinheitId={initialEinheitId}
      initialDetail={initialDetail}
    />
  );
}
