import { SectionCard } from "@/components/ui/section-card";
import { Activity } from "lucide-react";

export default function PortalStatusPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-6 md:py-10">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Mein Status
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hier siehst du bald den Fortschritt deiner Reservierung in Echtzeit.
        </p>
      </header>

      <SectionCard
        icon={<Activity className="h-5 w-5" />}
        title="Status-Pipeline"
        subtitle="In Vorbereitung"
      >
        <p className="text-sm text-muted-foreground">
          Reservierung, Bonitätsprüfung, Finanzierung und Beurkundung, alle
          Etappen auf einen Blick. Wir bauen diesen Bereich gerade für dich aus.
        </p>
      </SectionCard>
    </div>
  );
}
