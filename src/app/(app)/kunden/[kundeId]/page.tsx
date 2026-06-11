import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getKunde } from "@/lib/data/kunden";
import { Button } from "@/components/ui/button";
import { KundeDetailView } from "@/components/kunden/KundeDetailView";

export const metadata = {
  title: "Kunde · Objektpilot",
};

export default async function KundeDetailPage({
  params,
}: {
  params: Promise<{ kundeId: string }>;
}) {
  const { kundeId } = await params;

  let kunde;
  try {
    kunde = await getKunde(kundeId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Kunde nicht gefunden";
    return (
      <div className="container mx-auto space-y-4 p-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/kunden">
            <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
          </Link>
        </Button>
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {msg}
        </div>
      </div>
    );
  }

  return <KundeDetailView kunde={kunde} />;
}
