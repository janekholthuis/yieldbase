import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProjektDetail, getEinheitDetail } from "@/lib/data/objekte";
import { getKalkulationsContext } from "@/lib/data/kalkulation-context";
import { Button } from "@/components/ui/button";
import { ProjektDetailView } from "@/components/objekte/ProjektDetailView";

export const metadata = {
  title: "Projekt-Detail · Objektpilot",
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
  const [{ projekt, error }, kalkContext] = await Promise.all([
    getProjektDetail(projektId),
    getKalkulationsContext(),
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
  const initialUnitId =
    initialEinheitId &&
    projekt.einheiten.some((u) => u.einheit_id === initialEinheitId)
      ? initialEinheitId
      : (projekt.einheiten[0]?.einheit_id ?? null);
  const initialDetail = initialUnitId
    ? (await getEinheitDetail(initialUnitId)).einheit
    : null;

  return (
    <ProjektDetailView
      projekt={projekt}
      kalkContext={kalkContext}
      initialEinheitId={initialEinheitId}
      initialDetail={initialDetail}
    />
  );
}
