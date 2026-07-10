/**
 * CRM-Prototyp (PROJ-35) — statische Mock-Daten.
 *
 * Reiner UI-Prototyp im „Close"-Stil: Kontakte (B2C, keine Unternehmen),
 * Vertriebs-Pipeline als Smart Views, Kontakt-Detail mit Aktivitäts-Timeline
 * und (gemocktem) E-Mail-Sync. KEINE echten Funktionen / keine DB.
 */

import {
  UserPlus,
  MessageSquare,
  CalendarPlus,
  CalendarCheck,
  Hourglass,
  ClipboardCheck,
  FileSignature,
  Handshake,
  PenLine,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type StageKey =
  | "neue_leads"
  | "follow_up"
  | "neu_terminieren"
  | "gespraech_terminiert"
  | "warte_selbstauskunft"
  | "selbstauskunft_erhalten"
  | "reservierungsprozess"
  | "angebotsbesprechung"
  | "notarauftrag"
  | "notartermin"
  | "verloren";

export interface PipelineStage {
  key: StageKey;
  label: string;
  /** Lucide-Icon der Stufe (statt Emoji). */
  icon: LucideIcon;
  /** On-brand dot-color (Funnel-Phase). */
  dot: string;
  /** On-brand bg+text für die Status-Pill. */
  soft: string;
}

/*
 * Vertriebs-Pipeline. Farbe = Funnel-PHASE (bewusst gruppiert, nicht pro Stufe
 * eine Regenbogenfarbe), Icon = konkrete Stufe. Alle Töne on-brand:
 * neutral · steel (info) · gold (accent) · grün (success) · rot (destructive).
 */
const TONE = {
  neutral: { dot: "bg-brand-subtle", soft: "bg-brand-surfaceMuted text-brand-muted" },
  info: { dot: "bg-info", soft: "bg-info-soft text-info" },
  accent: { dot: "bg-brand-accent", soft: "bg-brand-accentSoft text-brand-accentText" },
  success: { dot: "bg-success", soft: "bg-success-soft text-success" },
  destructive: { dot: "bg-destructive", soft: "bg-destructive-soft text-destructive" },
} as const;

export const PIPELINE: PipelineStage[] = [
  { key: "neue_leads", label: "Neue Leads", icon: UserPlus, ...TONE.neutral },
  { key: "follow_up", label: "Follow Up", icon: MessageSquare, ...TONE.neutral },
  { key: "neu_terminieren", label: "Neu Terminieren", icon: CalendarPlus, ...TONE.neutral },
  { key: "gespraech_terminiert", label: "Gespräch terminiert", icon: CalendarCheck, ...TONE.info },
  { key: "warte_selbstauskunft", label: "Warte auf Selbstauskunft", icon: Hourglass, ...TONE.info },
  {
    key: "selbstauskunft_erhalten",
    label: "Selbstauskunft erhalten (Finanzierungsprüfung)",
    icon: ClipboardCheck,
    ...TONE.info,
  },
  { key: "reservierungsprozess", label: "Reservierungsprozess", icon: FileSignature, ...TONE.accent },
  { key: "angebotsbesprechung", label: "Angebotsbesprechung", icon: Handshake, ...TONE.accent },
  { key: "notarauftrag", label: "Notarauftrag unterschrieben", icon: PenLine, ...TONE.accent },
  { key: "notartermin", label: "Notartermin", icon: CheckCircle2, ...TONE.success },
  { key: "verloren", label: "Verloren", icon: XCircle, ...TONE.destructive },
];

export const STAGE_BY_KEY: Record<StageKey, PipelineStage> = Object.fromEntries(
  PIPELINE.map((s) => [s.key, s]),
) as Record<StageKey, PipelineStage>;

export type ActivityType =
  | "status_change"
  | "note"
  | "email_in"
  | "email_out"
  | "call"
  | "meeting"
  | "sms"
  | "task"
  | "imported";

export interface Activity {
  id: string;
  type: ActivityType;
  /** Anzeige-Zeit, z.B. „vor 4 Tagen", „25. Jun". */
  when: string;
  actor: string; // Initialen des Handelnden, z.B. „JH"
  title?: string;
  body?: string;
  /** Nur für status_change. */
  from?: StageKey;
  to?: StageKey;
  /** Nur für E-Mails. */
  subject?: string;
  important?: boolean;
}

export interface CustomField {
  label: string;
  value: string;
  /** Interne Route für verlinkte Felder (z.B. Angefragtes Objekt). */
  href?: string;
  /** Externer Link (Drive etc.). */
  external?: boolean;
  /** Person-Feld (z.B. Zuständiger) → Avatar-Chip. */
  person?: boolean;
}

export interface LinkedObjekt {
  id: string;
  name: string;
  stadt: string;
  kaufpreis: string;
  wohnung: string;
}

export interface CrmContact {
  id: string;
  vorname: string;
  nachname: string;
  stage: StageKey;
  email: string;
  telefon: string;
  stadt: string;
  website?: string;
  quelle: string; // Empfehlungsgeber / Lead-Quelle
  createdWhen: string;
  lastActivity: string;
  objekt: LinkedObjekt | null;
  customFields: CustomField[];
  activities: Activity[];
}

function fullFields(over: Partial<Record<string, string>>): CustomField[] {
  return [
    { label: "Angefragtes Objekt", value: over.objekt ?? "—", href: "/objekte" },
    { label: "Berufssituation", value: over.beruf ?? "—" },
    { label: "Nettoeinkommen", value: over.netto ?? "—" },
    { label: "Eigenkapital", value: over.ek ?? "—" },
    { label: "Investment Ziel", value: over.ziel ?? "—" },
    { label: "Empfehlungsgeber", value: over.quelle ?? "—" },
    { label: "Staatsangehörigkeit", value: over.staat ?? "Deutsch" },
    { label: "Geburtsdatum", value: over.gebdat ?? "—" },
    { label: "Drive Link", value: "drive.google.com/…", external: true },
    { label: "Selbstauskunft", value: over.sa ?? "Offen" },
    { label: "Reservierung", value: over.res ?? "—" },
    { label: "Airtable Record ID", value: over.rec ?? "recXXXXXXXXXX" },
  ];
}

export const CONTACTS: CrmContact[] = [
  {
    id: "janek-test",
    vorname: "Janek",
    nachname: "Test",
    stage: "reservierungsprozess",
    email: "janek@enablence.ai",
    telefon: "+49 151 23456789",
    stadt: "Essen",
    website: "enablence.ai",
    quelle: "Facebook Ad",
    createdWhen: "16. Jun",
    lastActivity: "vor 4 Tagen",
    objekt: {
      id: "essen-2z",
      name: "2-Zimmer ETW Essen",
      stadt: "Essen",
      kaufpreis: "224.000 €",
      wohnung: "WE 12",
    },
    customFields: [
      { label: "Airtable Record ID", value: "recssEoaeUIO1qHBQ" },
      { label: "Angefragtes Objekt", value: "2-Zimmer ETW Essen", href: "/objekte" },
      { label: "Berufssituation", value: "Beamtin – Gymnasiallehrerin" },
      { label: "Drive Link", value: "https://drive.google.com/drive/…", external: true },
      { label: "Eigenkapital", value: "50.000 €" },
      { label: "Empfehlungsgeber", value: "Facebook Ad" },
      { label: "Investment Ziel", value: "Altersvorsorge" },
      { label: "Nettoeinkommen", value: "4.000 € netto/Monat" },
      { label: "Resi Link", value: "https://forms.fillout.com/t/25d…", external: true },
      { label: "SA Link", value: "https://forms.fillout.com/t/visci…", external: true },
      { label: "Startzeitpunkt", value: "In 3-6 Monaten" },
      { label: "Zuständiger", value: "Janek Holthuis", person: true },
    ],
    activities: [
      {
        id: "a1",
        type: "status_change",
        when: "vor 4 Tagen",
        actor: "JH",
        from: "selbstauskunft_erhalten",
        to: "reservierungsprozess",
      },
      {
        id: "a2",
        type: "status_change",
        when: "25. Jun",
        actor: "JH",
        from: "warte_selbstauskunft",
        to: "selbstauskunft_erhalten",
      },
      {
        id: "a3",
        type: "note",
        when: "18. Jun",
        actor: "JH",
        body: "Janek Test hat die Reservierung unterschrieben. Alle Bestätigungen liegen vor, Reservierungsgebühr angekündigt.",
        important: true,
      },
      {
        id: "a4",
        type: "email_out",
        when: "18. Jun",
        actor: "JH",
        subject: "Reservierung Erfolg mit Immobilien",
        body: "Hey Janek, Janek hier von Erfolg mit Immobilien. Hier kannst du deine Reservierung ausfüllen: forms.fillout.com/t/25d6…",
      },
      {
        id: "a5",
        type: "note",
        when: "18. Jun",
        actor: "JH",
        body: "Janek Test hat die Selbstauskunft ausgefüllt.",
        important: true,
      },
      {
        id: "a6",
        type: "status_change",
        when: "18. Jun",
        actor: "JH",
        from: "neu_terminieren",
        to: "warte_selbstauskunft",
      },
      {
        id: "a7",
        type: "email_out",
        when: "18. Jun",
        actor: "JH",
        subject: "Selbstauskunft Erfolg mit Immobilien",
        body: "Hey Janek, ich bin's, Janek von Enablence Ltd. Wie besprochen, gibt es direkt die Selbstauskunft automatisch per Link zum Ausfüllen …",
      },
      {
        id: "a8",
        type: "imported",
        when: "18. Jun",
        actor: "JH",
        title: "Imported via API",
      },
      {
        id: "a9",
        type: "note",
        when: "16. Jun",
        actor: "JH",
        body: "Erstgespräch war sehr positiv. Interesse an Kapitalanlage zur Altersvorsorge, Budget passt.",
      },
    ],
  },
  {
    id: "sarah-brandt",
    vorname: "Sarah",
    nachname: "Brandt",
    stage: "warte_selbstauskunft",
    email: "s.brandt@gmx.de",
    telefon: "+49 170 5551234",
    stadt: "Halle (Saale)",
    quelle: "Empfehlung – M. König",
    createdWhen: "20. Jun",
    lastActivity: "vor 2 Tagen",
    objekt: {
      id: "halle-3z",
      name: "3-Zimmer Altbau Halle",
      stadt: "Halle (Saale)",
      kaufpreis: "189.500 €",
      wohnung: "WE 4",
    },
    customFields: fullFields({
      objekt: "3-Zimmer Altbau Halle",
      beruf: "Angestellte – IT-Projektleiterin",
      netto: "3.600 € netto/Monat",
      ek: "35.000 €",
      ziel: "Cashflow + Steuervorteil",
      quelle: "Empfehlung – M. König",
      gebdat: "02.11.1991",
      sa: "Link versendet",
    }),
    activities: [
      {
        id: "b1",
        type: "status_change",
        when: "vor 2 Tagen",
        actor: "JH",
        from: "gespraech_terminiert",
        to: "warte_selbstauskunft",
      },
      {
        id: "b2",
        type: "email_out",
        when: "vor 2 Tagen",
        actor: "JH",
        subject: "Deine Selbstauskunft",
        body: "Hallo Sarah, wie besprochen hier der Link zur Selbstauskunft. Danach prüfen wir gemeinsam die Finanzierung.",
      },
      {
        id: "b3",
        type: "meeting",
        when: "24. Jun",
        actor: "JH",
        title: "Beratungsgespräch (Zoom)",
        body: "45 min · Objekt vorgestellt, Kalkulation durchgesprochen.",
      },
      {
        id: "b4",
        type: "call",
        when: "21. Jun",
        actor: "JH",
        title: "Anruf · 8 min",
        body: "Erstkontakt, Termin vereinbart.",
      },
    ],
  },
  {
    id: "murat-yilmaz",
    vorname: "Murat",
    nachname: "Yılmaz",
    stage: "selbstauskunft_erhalten",
    email: "murat.yilmaz@outlook.com",
    telefon: "+49 176 4443322",
    stadt: "Dortmund",
    quelle: "Instagram Ad",
    createdWhen: "12. Jun",
    lastActivity: "gestern",
    objekt: {
      id: "do-2z",
      name: "2-Zimmer Neubau Dortmund",
      stadt: "Dortmund",
      kaufpreis: "268.000 €",
      wohnung: "WE 8",
    },
    customFields: fullFields({
      objekt: "2-Zimmer Neubau Dortmund",
      beruf: "Selbstständig – Handwerksbetrieb",
      netto: "5.200 € netto/Monat",
      ek: "80.000 €",
      ziel: "Vermögensaufbau",
      quelle: "Instagram Ad",
      gebdat: "19.07.1985",
      sa: "Eingereicht (gestern)",
    }),
    activities: [
      {
        id: "c1",
        type: "status_change",
        when: "gestern",
        actor: "JH",
        from: "warte_selbstauskunft",
        to: "selbstauskunft_erhalten",
      },
      {
        id: "c2",
        type: "note",
        when: "gestern",
        actor: "JH",
        body: "Murat hat die Selbstauskunft ausgefüllt. Finanzierungsprüfung läuft.",
        important: true,
      },
      {
        id: "c3",
        type: "sms",
        when: "14. Jun",
        actor: "JH",
        body: "Kurze Erinnerung an die Selbstauskunft – melde dich gern bei Fragen!",
      },
    ],
  },
  {
    id: "lena-hofmann",
    vorname: "Lena",
    nachname: "Hofmann",
    stage: "gespraech_terminiert",
    email: "lena.hofmann@web.de",
    telefon: "+49 152 7778890",
    stadt: "Leipzig",
    quelle: "Facebook Ad",
    createdWhen: "26. Jun",
    lastActivity: "vor 3 Tagen",
    objekt: null,
    customFields: fullFields({
      beruf: "Angestellte – Krankenschwester",
      netto: "2.900 € netto/Monat",
      ek: "20.000 €",
      ziel: "Altersvorsorge",
      quelle: "Facebook Ad",
      gebdat: "08.05.1994",
    }),
    activities: [
      {
        id: "d1",
        type: "meeting",
        when: "vor 3 Tagen",
        actor: "JH",
        title: "Beratungstermin vereinbart",
        body: "Mo, 14:00 Uhr · Videocall.",
      },
      {
        id: "d2",
        type: "status_change",
        when: "27. Jun",
        actor: "JH",
        from: "follow_up",
        to: "gespraech_terminiert",
      },
      {
        id: "d3",
        type: "imported",
        when: "26. Jun",
        actor: "JH",
        title: "Imported via API",
      },
    ],
  },
  {
    id: "thomas-krueger",
    vorname: "Thomas",
    nachname: "Krüger",
    stage: "notartermin",
    email: "t.krueger@mailbox.org",
    telefon: "+49 160 1122334",
    stadt: "Magdeburg",
    quelle: "Empfehlung – Bestandskunde",
    createdWhen: "02. Mai",
    lastActivity: "vor 1 Woche",
    objekt: {
      id: "md-3z",
      name: "3-Zimmer ETW Magdeburg",
      stadt: "Magdeburg",
      kaufpreis: "212.000 €",
      wohnung: "WE 2",
    },
    customFields: fullFields({
      objekt: "3-Zimmer ETW Magdeburg",
      beruf: "Angestellter – Ingenieur",
      netto: "4.800 € netto/Monat",
      ek: "60.000 €",
      ziel: "Steueroptimierung",
      quelle: "Empfehlung – Bestandskunde",
      gebdat: "23.09.1980",
      sa: "Eingereicht",
      res: "Unterschrieben",
    }),
    activities: [
      {
        id: "e1",
        type: "status_change",
        when: "vor 1 Woche",
        actor: "JH",
        from: "notarauftrag",
        to: "notartermin",
      },
      {
        id: "e2",
        type: "note",
        when: "vor 1 Woche",
        actor: "JH",
        body: "Notartermin bestätigt: 15.07. um 10:00 Uhr, Notariat Dr. Weber.",
        important: true,
      },
      {
        id: "e3",
        type: "email_in",
        when: "vor 9 Tagen",
        actor: "TK",
        subject: "Re: Finanzierungszusage",
        body: "Hallo Janek, die Bank hat die Zusage erteilt. Wir können mit dem Notar weitermachen!",
      },
    ],
  },
  {
    id: "aylin-demir",
    vorname: "Aylin",
    nachname: "Demir",
    stage: "neue_leads",
    email: "aylin.demir@gmail.com",
    telefon: "+49 157 9988776",
    stadt: "Bochum",
    quelle: "Google Ads",
    createdWhen: "gestern",
    lastActivity: "gestern",
    objekt: null,
    customFields: fullFields({
      beruf: "Angestellte – Steuerfachangestellte",
      netto: "3.100 € netto/Monat",
      ek: "25.000 €",
      ziel: "Kapitalanlage",
      quelle: "Google Ads",
    }),
    activities: [
      {
        id: "f1",
        type: "imported",
        when: "gestern",
        actor: "JH",
        title: "Imported via API",
      },
      {
        id: "f2",
        type: "note",
        when: "gestern",
        actor: "JH",
        body: "Neuer Lead über Google Ads. Noch nicht kontaktiert.",
      },
    ],
  },
  {
    id: "peter-vogel",
    vorname: "Peter",
    nachname: "Vogel",
    stage: "verloren",
    email: "p.vogel@t-online.de",
    telefon: "+49 171 6655443",
    stadt: "Kassel",
    quelle: "Facebook Ad",
    createdWhen: "10. Mai",
    lastActivity: "vor 2 Wochen",
    objekt: null,
    customFields: fullFields({
      beruf: "Rentner",
      netto: "2.400 € netto/Monat",
      ek: "15.000 €",
      ziel: "—",
      quelle: "Facebook Ad",
    }),
    activities: [
      {
        id: "g1",
        type: "status_change",
        when: "vor 2 Wochen",
        actor: "JH",
        from: "follow_up",
        to: "verloren",
      },
      {
        id: "g2",
        type: "note",
        when: "vor 2 Wochen",
        actor: "JH",
        body: "Kein Interesse mehr, Bonität reicht nicht für Finanzierung. Archiviert.",
      },
    ],
  },
];

export function getContact(id: string): CrmContact | undefined {
  return CONTACTS.find((c) => c.id === id);
}

export function initials(vorname: string, nachname: string): string {
  return `${vorname[0] ?? ""}${nachname[0] ?? ""}`.toUpperCase();
}

/** Gemockter E-Mail-Sync-Zustand für die Prototyp-Anzeige. */
export const EMAIL_SYNC = {
  connected: true,
  address: "janek@erfolg-mit-immobilien.com",
  provider: "Google Workspace",
  lastSync: "vor 3 Minuten",
};
