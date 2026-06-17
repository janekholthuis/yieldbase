import { listProjekteUebersicht } from "@/lib/data/objekte";
import { ObjekteListView } from "@/components/objekte/ObjekteListView";

export const metadata = {
  title: "Objekte · Objektpilot",
};

export default async function ObjektePage() {
  const { items, error } = await listProjekteUebersicht();

  if (error) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Fehler beim Laden: {error}
        </div>
      </div>
    );
  }

  return <ObjekteListView projekte={items} />;
}
