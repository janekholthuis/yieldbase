import { SectionCard } from "@/components/ui/section-card";
import { MessageCircle } from "lucide-react";

export default function PortalNachrichtenPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-6 md:py-10">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Nachrichten
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schreib deinem Berater oder unserem Support direkt im Portal.
        </p>
      </header>

      <SectionCard
        icon={<MessageCircle className="h-5 w-5" />}
        title="Konversationen"
        subtitle="In Vorbereitung"
      >
        <p className="text-sm text-muted-foreground">
          Hier kannst du bald Anfragen an deinen Berater stellen, Antworten lesen
          und den Verlauf nachvollziehen. Bis dahin erreichst du deinen Berater
          per E-Mail oder Telefon. Alle Kontaktdaten findest du auf der
          Übersichtsseite.
        </p>
      </SectionCard>
    </div>
  );
}
