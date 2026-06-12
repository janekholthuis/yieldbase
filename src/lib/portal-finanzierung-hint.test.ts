import { describe, it, expect } from "vitest";
import {
  pickHighestCaseStatus,
  pickFinanzierungHint,
} from "./portal-finanzierung-hint";
import { CASE_STATUS_KUNDE, type CaseStatus } from "./finanzierung-status";

// PROJ-7: customer-portal financing hint.

describe("pickHighestCaseStatus", () => {
  it("returns null when there are no cases", () => {
    expect(pickHighestCaseStatus([])).toBeNull();
  });

  it("picks the most advanced known status", () => {
    expect(
      pickHighestCaseStatus([
        { status: "neu" },
        { status: "angebot_vorhanden" },
        { status: "bewilligt" },
      ]),
    ).toBe("bewilligt");
  });

  it("ignores legacy/unknown statuses not in the priority list", () => {
    // 'ausgezahlt'/'genehmigt' are legacy enum values excluded from priority.
    expect(
      pickHighestCaseStatus([{ status: "ausgezahlt" }, { status: "neu" }]),
    ).toBe("neu");
  });

  it("returns null when every case has a legacy status", () => {
    expect(
      pickHighestCaseStatus([{ status: "ausgezahlt" }, { status: "genehmigt" }]),
    ).toBeNull();
  });
});

describe("pickFinanzierungHint", () => {
  const noCases: { status: CaseStatus }[] = [];

  it("shows the CTA when no Selbstauskunft and no cases", () => {
    expect(
      pickFinanzierungHint({
        cases: noCases,
        hasReservierung: false,
        submittedAt: null,
        maxFin: null,
      }),
    ).toEqual({ kind: "cta" });
  });

  it("surfaces the customer-facing text of the top case status", () => {
    const hint = pickFinanzierungHint({
      cases: [{ status: "angebot_beim_kunden" }],
      hasReservierung: true,
      submittedAt: "2026-01-01",
      maxFin: 300000,
    });
    expect(hint).toEqual({
      kind: "case-status",
      text: `${CASE_STATUS_KUNDE.angebot_beim_kunden}.`,
    });
  });

  it("falls back to the Rahmen hint for cases with only legacy statuses", () => {
    const hint = pickFinanzierungHint({
      cases: [{ status: "ausgezahlt" }],
      hasReservierung: false,
      submittedAt: null,
      maxFin: null,
    });
    expect(hint.kind).toBe("rahmen");
  });

  it("shows the wait-for-VP hint after a reservation with a submitted Selbstauskunft", () => {
    const hint = pickFinanzierungHint({
      cases: noCases,
      hasReservierung: true,
      submittedAt: "2026-01-01",
      maxFin: 250000,
    });
    expect(hint.kind).toBe("wait-vp");
  });

  it("shows the Rahmen hint with a financing budget but no reservation yet", () => {
    const hint = pickFinanzierungHint({
      cases: noCases,
      hasReservierung: false,
      submittedAt: "2026-01-01",
      maxFin: 250000,
    });
    expect(hint.kind).toBe("rahmen");
  });
});
