import { CASE_STATUS_KUNDE, type CaseStatus } from "@/lib/finanzierung-status";

/**
 * Priorität für die KPI-Kachel „Finanzierung" auf /portal.
 * Höchster Fortschritts-Status zuerst.
 *
 * Spec-Master Modul 6 Sektion 9 definiert exakt 9 Stati. Alt-Werte aus dem
 * laufenden Enum-Cleanup (TD-2) wie `ausgezahlt`, `genehmigt`, `in_pruefung`,
 * `angefragt` sind hier bewusst NICHT enthalten — der Helper darf keine
 * Alt-Werte zementieren. Cases mit Alt-Status fallen durch das Mapping und
 * werden im Default-Branch defensiv als `rahmen` behandelt.
 */
const CASE_STATUS_PRIORITY: readonly CaseStatus[] = [
  "bewilligt",
  "angebot_akzeptiert",
  "angebot_beim_kunden",
  "angebot_vorhanden",
  "unterlagen_fehlen",
  "in_bearbeitung",
  "neu",
  "abgelehnt",
  "storniert",
] as const;

function rank(s: CaseStatus): number {
  const i = CASE_STATUS_PRIORITY.indexOf(s);
  return i === -1 ? Number.POSITIVE_INFINITY : i;
}

function isKnown(s: CaseStatus): boolean {
  return CASE_STATUS_PRIORITY.indexOf(s) !== -1;
}

export function pickHighestCaseStatus(
  cases: ReadonlyArray<{ status: CaseStatus }>,
): CaseStatus | null {
  const known = cases.filter((c) => isKnown(c.status));
  if (known.length === 0) return null;
  return [...known].sort((a, b) => rank(a.status) - rank(b.status))[0].status;
}

export type FinanzierungHint =
  | { kind: "cta" }
  | { kind: "rahmen"; text: string }
  | { kind: "wait-vp"; text: string }
  | { kind: "case-status"; text: string };

const RAHMEN_TEXT =
  "Diese Zahl gibt deinen Finanzierungsrahmen an. Sobald du eine Wohnung reserviert hast, melden sich unsere Finanzierungspartner.";

export function pickFinanzierungHint(args: {
  cases: ReadonlyArray<{ status: CaseStatus }>;
  hasReservierung: boolean;
  submittedAt: string | null;
  maxFin: number | null;
}): FinanzierungHint {
  const top = pickHighestCaseStatus(args.cases);
  if (top) {
    return { kind: "case-status", text: `${CASE_STATUS_KUNDE[top]}.` };
  }
  if (!args.submittedAt || args.maxFin == null) {
    // Cases ohne bekannten Status → defensiv als Rahmen-Hinweis,
    // wenn auch keine Selbstauskunft vorliegt bleibt es beim CTA.
    if (args.cases.length > 0) {
      return { kind: "rahmen", text: RAHMEN_TEXT };
    }
    return { kind: "cta" };
  }
  if (args.hasReservierung) {
    return {
      kind: "wait-vp",
      text:
        "Dein Berater erstellt in Kürze deine Finanzierungsanfrage. Du wirst informiert, sobald ein Angebot vorliegt.",
    };
  }
  return { kind: "rahmen", text: RAHMEN_TEXT };
}
