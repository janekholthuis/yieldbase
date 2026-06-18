// Öffentliche Selbstauskunft OHNE Login (PROJ-7). Der Kunde öffnet den vom
// Berater versendeten Token-Link, füllt aus und unterschreibt — kein Account
// nötig. Login folgt erst ab Reservierung. Guard: /selbstauskunft ist in
// proxy.ts (PUBLIC_PREFIXES) freigegeben.
import { getSelbstauskunftByToken } from "@/lib/actions/selbstauskunft-public";
import { SelbstauskunftWizard } from "@/components/portal/SelbstauskunftWizard";
import {
  emptySelbstauskunft,
  emptyPerson,
  applyPrefill,
  type SelbstauskunftData,
} from "@/lib/selbstauskunft";

export const metadata = {
  title: "Selbstauskunft",
  // Magic-Link mit PII-Prefill — niemals indexieren.
  robots: { index: false, follow: false },
};

function InvalidLink() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-semibold text-brand-ink">Link ungültig</h1>
      <p className="mt-2 text-sm text-brand-body">
        Dieser Selbstauskunft-Link ist ungültig oder abgelaufen. Bitte fordern Sie
        bei Ihrem Ansprechpartner einen neuen Link an.
      </p>
    </div>
  );
}

export default async function PublicSelbstauskunftPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let ctx: Awaited<ReturnType<typeof getSelbstauskunftByToken>>;
  try {
    ctx = await getSelbstauskunftByToken(token);
  } catch {
    return <InvalidLink />;
  }

  let data: SelbstauskunftData;
  if (ctx.existing?.daten) {
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
    data.haupt = applyPrefill(emptyPerson(), {}, ctx.prefill);
  }

  const crm = {
    close_lead_id: ctx.existing?.close_lead_id ?? null,
    close_opportunity_id: ctx.existing?.close_opportunity_id ?? null,
    berater_vorname:
      ctx.existing?.berater_vorname ?? ctx.berater?.vorname ?? null,
    berater_nachname:
      ctx.existing?.berater_nachname ?? ctx.berater?.nachname ?? null,
  };

  return (
    <SelbstauskunftWizard
      initialData={data}
      alreadySubmitted={ctx.existing?.status === "eingereicht"}
      submittedAt={ctx.existing?.submitted_at ?? null}
      startStep={ctx.existing?.step ?? 0}
      crm={crm}
      token={token}
    />
  );
}
