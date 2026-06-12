import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProjektDetail } from "@/lib/data/objekte";
import { getKalkulationsContext } from "@/lib/data/kalkulation-context";
import { Button } from "@/components/ui/button";
import { ProjektDetailView } from "@/components/objekte/ProjektDetailView";

export const metadata = {
  title: "Projekt-Detail · Objektpilot",
};

export default async function ProjektDetailPage({
  params,
}: {
  params: Promise<{ projektId: string }>;
}) {
  const { projektId } = await params;
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

  return <ProjektDetailView projekt={projekt} kalkContext={kalkContext} />;
}
