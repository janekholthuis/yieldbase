import { SectionCard } from "@/components/ui/section-card";
import { FolderClosed } from "lucide-react";

// TODO(migration): kunden documents storage — wire up secure upload + listing
// (KundenDokumenteListe, kunden_dokumente table, storage bucket) once the
// document feature is ported. For now this is a faithful placeholder.
export default function PortalDokumentePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-6 md:py-10">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Meine Unterlagen
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lade hier bald deine Finanzierungs-Unterlagen sicher hoch.
        </p>
      </header>

      <SectionCard
        icon={<FolderClosed className="h-5 w-5" />}
        title="Dokumenten-Upload folgt"
        subtitle="In Vorbereitung"
      >
        <p className="text-sm text-muted-foreground">
          Sobald alles vollständig ist, prüfen wir deine Finanzierungs-Optionen
          und melden uns bei dir. Alle Dateien werden verschlüsselt und nur für
          dich und deinen Berater sichtbar gespeichert. Wir bauen diesen Bereich
          gerade für dich aus.
        </p>
      </SectionCard>
    </div>
  );
}
