import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getEinheitDetail } from "@/lib/data/objekte";
import { Button } from "@/components/ui/button";
import { EinheitDetailView } from "@/components/objekte/EinheitDetailView";

export const metadata = {
  title: "Objekt-Detail · Objektpilot",
};

export default async function EinheitDetailPage({
  params,
}: {
  params: Promise<{ einheitId: string }>;
}) {
  const { einheitId } = await params;
  const { einheit, error } = await getEinheitDetail(einheitId);

  if (error || !einheit) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/objekte">
            <ArrowLeft className="mr-1 h-4 w-4" /> Zurück
          </Link>
        </Button>
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error ?? "Einheit nicht gefunden"}
        </div>
      </div>
    );
  }

  return <EinheitDetailView einheit={einheit} />;
}
