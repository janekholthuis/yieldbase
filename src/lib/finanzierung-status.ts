// Plain (non-server) module: case status constants + types shared by both UI
// and `portal-finanzierung-hint.ts`. Importing this must NOT pull in any server
// code. Ported verbatim from the OLD APP finanzierung.functions.ts.

const CASE_STATUS = [
  "neu",
  "in_pruefung",
  "angefragt",
  "genehmigt",
  "abgelehnt",
  "ausgezahlt",
  "in_bearbeitung",
  "unterlagen_fehlen",
  "angebot_vorhanden",
  "angebot_beim_kunden",
  "angebot_akzeptiert",
  "bewilligt",
  "storniert",
] as const;

export { CASE_STATUS };

export type CaseStatus = (typeof CASE_STATUS)[number];

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  neu: "Neu",
  in_pruefung: "In Prüfung",
  angefragt: "Angefragt",
  genehmigt: "Genehmigt",
  abgelehnt: "Abgelehnt",
  ausgezahlt: "Ausgezahlt",
  in_bearbeitung: "In Bearbeitung",
  unterlagen_fehlen: "Unterlagen fehlen",
  angebot_vorhanden: "Angebot vorhanden",
  angebot_beim_kunden: "Angebot beim Kunden",
  angebot_akzeptiert: "Angebot akzeptiert",
  bewilligt: "Bewilligt",
  storniert: "Storniert",
};

/** Status-Mapping aus Kundensicht (Portal-Card). */
export const CASE_STATUS_KUNDE: Record<CaseStatus, string> = {
  neu: "Finanzierung angefragt",
  in_pruefung: "Finanzierung wird gerade geprüft",
  angefragt: "Finanzierung angefragt",
  in_bearbeitung: "Finanzierung wird gerade geprüft",
  unterlagen_fehlen: "Unterlagen werden noch benötigt",
  angebot_vorhanden: "Angebot vom Finanzierungspartner liegt vor",
  angebot_beim_kunden: "Angebot liegt zur Prüfung bei dir",
  angebot_akzeptiert: "Angebot angenommen",
  genehmigt: "Finanzierung genehmigt",
  bewilligt: "Finanzierung bewilligt",
  ausgezahlt: "Finanzierung ausgezahlt",
  abgelehnt: "Finanzierung abgelehnt",
  storniert: "Finanzierungsanfrage storniert",
};
