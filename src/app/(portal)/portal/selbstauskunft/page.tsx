import { getMySelbstauskunftContext } from "@/lib/actions/selbstauskunft";
import {
  SelbstauskunftHub,
  type SelbstauskunftDocsContext,
} from "@/components/portal/SelbstauskunftHub";
import { requireUser } from "@/lib/auth";
import { getPortalDashboard } from "@/lib/data/portal";
import {
  emptySelbstauskunft,
  emptyPerson,
  applyPrefill,
  type SelbstauskunftData,
} from "@/lib/selbstauskunft";

// Prefill aus Close.io kommt als URL-Query (Lead-Link). Erstes Nicht-Leeres
// gewinnt: URL-Parameter vor DB (eingeloggter Kunde). Versteckte CRM-Felder
// (close_*, berater_*) werden durchgereicht, nie angezeigt.
type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined): string | null =>
  (Array.isArray(v) ? v[0] : v)?.trim() || null;

export default async function SelbstauskunftPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const [ctx, { userId }, dashboard] = await Promise.all([
    getMySelbstauskunftContext(),
    requireUser(),
    getPortalDashboard(),
  ]);

  // Unterlagen-Bereich nur, wenn ein Kundenprofil verknüpft ist (Upload braucht
  // den authed Kontext). Snapshot der bereits hochgeladenen Kategorien.
  const docs: SelbstauskunftDocsContext | undefined = dashboard.kunde
    ? {
        kundeId: dashboard.kunde.id,
        berufStatus: dashboard.kunde.beruf_status,
        currentUserId: userId,
        uploadedCategories: dashboard.dokumentKategorien,
      }
    : undefined;

  let data: SelbstauskunftData;
  if (ctx.existing?.daten) {
    // Rehydrieren (gegen leere Defaults mergen, falls Schema gewachsen ist).
    const d = ctx.existing.daten;
    const base = emptySelbstauskunft();
    data = {
      ...base,
      ...d,
      haupt: { ...base.haupt, ...(d.haupt ?? {}) },
      mit: { ...base.mit, ...(d.mit ?? {}) },
      immobilien: Array.isArray(d.immobilien) ? d.immobilien : [],
      mitantragsteller: Boolean(d.mitantragsteller ?? ctx.existing.mitantragsteller),
    };
  } else {
    data = emptySelbstauskunft();
    const urlPrefill = {
      vorname: one(sp.vorname),
      nachname: one(sp.nachname),
      email: one(sp.mail) ?? one(sp.email),
      telefon: one(sp.telefon) ?? one(sp.telefonnr),
    };
    data.haupt = applyPrefill(emptyPerson(), urlPrefill, ctx.prefill);
  }

  const crm = {
    close_lead_id: one(sp.close_lead_id) ?? ctx.existing?.close_lead_id ?? null,
    close_opportunity_id:
      one(sp.close_opportunity_id) ?? ctx.existing?.close_opportunity_id ?? null,
    berater_vorname:
      one(sp.berater_vorname) ??
      ctx.existing?.berater_vorname ??
      ctx.berater?.vorname ??
      null,
    berater_nachname:
      one(sp.berater_nachname) ??
      ctx.existing?.berater_nachname ??
      ctx.berater?.nachname ??
      null,
  };

  return (
    <SelbstauskunftHub
      initialData={data}
      alreadySubmitted={ctx.existing?.status === "eingereicht"}
      submittedAt={ctx.existing?.submitted_at ?? null}
      startStep={ctx.existing?.step ?? 0}
      crm={crm}
      docs={docs}
    />
  );
}
