import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Objekt-Detail · Objektpilot",
};

// Die frühere komplizierte Einheiten-Unterseite ist in die Projektseite
// integriert (Master-Detail im Tab „Einheiten"). Diese Route leitet daher auf
// die Projektseite mit vorgewählter Wohnung weiter — bestehende Links/Deep-Links
// bleiben funktionsfähig.
export default async function EinheitDetailPage({
  params,
}: {
  params: Promise<{ einheitId: string }>;
}) {
  const { einheitId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("einheiten")
    .select("projekt_id")
    .eq("id", einheitId)
    .maybeSingle();

  if (data?.projekt_id) {
    redirect(`/objekte/projekt/${data.projekt_id}?einheit=${einheitId}`);
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/objekte">
          <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
        </Link>
      </Button>
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Einheit nicht gefunden
      </div>
    </div>
  );
}
