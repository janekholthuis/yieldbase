import { KundeNeuForm } from "@/components/kunden/KundeNeuForm";

export const metadata = {
  title: "Neuer Kunde · Erfolg mit Immobilien",
};

// Prefill aus Close.io: der Berater öffnet eine Lead-URL mit Query-Parametern
// (vorname/nachname/mail/telefon + close_lead_id/close_opportunity_id/berater_*).
// Die Werte befüllen das Anlegen-Formular und die CRM-IDs werden am Kunden
// gespeichert. Anschließend kann der Berater den Portal-Zugang versenden.
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | undefined =>
  (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export default async function KundeNeuPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  return (
    <KundeNeuForm
      initial={{
        vorname: one(sp.vorname),
        nachname: one(sp.nachname),
        email: one(sp.mail) ?? one(sp.email),
        telefon: one(sp.telefon) ?? one(sp.telefonnr),
      }}
      crm={{
        close_lead_id: one(sp.close_lead_id),
        close_opportunity_id: one(sp.close_opportunity_id),
        berater_vorname: one(sp.berater_vorname),
        berater_nachname: one(sp.berater_nachname),
      }}
    />
  );
}
