// Org-Entitlements (PROJ-31): Feature-Freischaltung pro Organisation.
//
// Strategie: Die App wird als "Custom-Plattform" verkauft, ist technisch aber EINE
// konfigurierbare Engine. "Custom" = Daten/Konfiguration pro Org, niemals geforkter
// Code. Welche Features eine Org sieht, steht in `organisationen.entitlements` (jsonb)
// als Override-Map ueber die hier definierten Defaults. Du schaltest pro Kunde manuell
// frei, was vertraglich vereinbart ist (Admin-UI) — Billing laeuft separat (Easybill).
//
// WICHTIG: Entitlements muessen serverseitig erzwungen werden (Server-Actions/RLS),
// nicht nur in der Navigation. Die Nav-Filterung ist nur Kosmetik.

export type EntitlementKey =
  | "finanzierungen"
  | "provisionen"
  | "ki"
  | "investagon_sync"
  | "demo_links"
  | "suchagenten"
  | "objektvergleiche"
  | "custom_selbstauskunft"
  | "integrationen";

export interface EntitlementDef {
  key: EntitlementKey;
  label: string;
  description: string;
  /** Wert, wenn die Org keinen expliziten Override gesetzt hat. */
  defaultEnabled: boolean;
}

/**
 * Feature-Katalog. `defaultEnabled` ist so gewaehlt, dass Bestands-Orgs nichts
 * verlieren: heute live ausgerollte Features defaulten auf `true`, neue/echte
 * Custom-Features auf `false` (werden pro Kunde manuell freigeschaltet).
 *
 * Kern-Module (Objekte, Kunden, Reservierungen, Profil, Einstellungen, Dashboard)
 * sind bewusst NICHT gated — sie sind das Produkt-Fundament fuer alle.
 */
export const ENTITLEMENT_CATALOG: readonly EntitlementDef[] = [
  {
    key: "finanzierungen",
    label: "Finanzierungen",
    description: "Lender-Cases, Angebote, Finanzierer-Pool.",
    defaultEnabled: true,
  },
  {
    key: "provisionen",
    label: "Provisionen",
    description: "Provisions-Abrechnung entlang der VP-Hierarchie.",
    defaultEnabled: true,
  },
  {
    key: "ki",
    label: "KI-Funktionen",
    description: "KI-Lageeinschaetzung, KI-Tags, KI-gestuetzte Inhalte.",
    defaultEnabled: true,
  },
  {
    key: "investagon_sync",
    label: "Investagon-Sync",
    description: "Spiegelung von Projekt-/Einheiten-Daten aus der Investagon-API.",
    defaultEnabled: true,
  },
  {
    key: "demo_links",
    label: "Demo-Links (Lead-Sandbox)",
    description: "Gebrandete Token-Demo-Links fuer die Akquise.",
    defaultEnabled: true,
  },
  {
    key: "suchagenten",
    label: "Suchagenten",
    description: "Gespeicherte Suchprofile + Auto-Match neuer Einheiten.",
    defaultEnabled: false,
  },
  {
    key: "objektvergleiche",
    label: "Objektvergleiche",
    description: "Side-by-side-Vergleich von Einheiten/Kennzahlen.",
    defaultEnabled: false,
  },
  {
    key: "custom_selbstauskunft",
    label: "Individuelle Selbstauskunft",
    description: "Kunden-spezifisches Feld-Schema fuer die Selbstauskunft.",
    defaultEnabled: false,
  },
  {
    key: "integrationen",
    label: "Externe Integrationen",
    description: "Webhooks + API-Keys (CRM-Sync, n8n/Make).",
    defaultEnabled: false,
  },
] as const;

const DEFAULTS: Record<EntitlementKey, boolean> = ENTITLEMENT_CATALOG.reduce(
  (acc, def) => {
    acc[def.key] = def.defaultEnabled;
    return acc;
  },
  {} as Record<EntitlementKey, boolean>,
);

/** Roh-Form, wie sie in `organisationen.entitlements` (jsonb) liegt. */
export type EntitlementOverrides = Partial<Record<EntitlementKey, boolean>>;

/** Vollstaendiger, aufgeloester Entitlement-Zustand einer Org. */
export type Entitlements = Record<EntitlementKey, boolean>;

/**
 * Loest die rohen Org-Overrides gegen die Katalog-Defaults auf. Unbekannte Keys
 * in den Overrides werden ignoriert (robust gegen alte/fremde jsonb-Daten).
 */
export function resolveEntitlements(
  overrides: EntitlementOverrides | null | undefined,
): Entitlements {
  const result = { ...DEFAULTS };
  if (overrides) {
    for (const def of ENTITLEMENT_CATALOG) {
      const v = overrides[def.key];
      if (typeof v === "boolean") result[def.key] = v;
    }
  }
  return result;
}

/** True, wenn die Org das Feature hat. Akzeptiert rohe Overrides oder aufgeloeste Map. */
export function hasEntitlement(
  entitlements: EntitlementOverrides | Entitlements | null | undefined,
  key: EntitlementKey,
): boolean {
  return resolveEntitlements(entitlements ?? null)[key];
}
