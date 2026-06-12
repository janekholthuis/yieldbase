import { requireUser } from "@/lib/auth";
import { getPortalDashboard } from "@/lib/data/portal";
import { SectionCard } from "@/components/ui/section-card";
import { FolderClosed } from "lucide-react";
import { KundenDokumenteListe } from "@/components/kunden-dokumente/KundenDokumenteListe";

export const metadata = {
  title: "Meine Unterlagen · Objektpilot",
};

export default async function PortalDokumentePage() {
  const { userId } = await requireUser();
  const { kunde } = await getPortalDashboard();

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-6 md:py-10">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Meine Unterlagen
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Lade hier deine Finanzierungs-Unterlagen sicher hoch. Alle Dateien
          werden verschlüsselt und nur für dich und deinen Berater gespeichert.
        </p>
      </header>

      {kunde ? (
        <KundenDokumenteListe
          kundeId={kunde.id}
          berufStatus={kunde.beruf_status}
          canUpload
          currentUserId={userId}
        />
      ) : (
        <SectionCard
          icon={<FolderClosed className="h-5 w-5" />}
          title="Noch kein Profil verknüpft"
          subtitle="In Vorbereitung"
        >
          <p className="text-sm text-muted-foreground">
            Sobald dein Kundenprofil verknüpft ist, kannst du hier deine
            Unterlagen hochladen.
          </p>
        </SectionCard>
      )}
    </div>
  );
}
