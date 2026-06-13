// Feature-Flags für vorübergehend deaktivierte Funktionen.
//
// Konvention (wie `comingSoon` in navigation.ts): Der Code bleibt vollständig
// erhalten; ein Flag schaltet die Funktion nur aus, damit sie später ohne
// Reimplementierung wieder aktiviert werden kann. Zum Aktivieren auf `true`
// setzen (oder per Env-Variable überschreiben).

/**
 * Organisations-Wechsel (Multi-Tenant Org-Switcher, PROJ-13).
 *
 * Vorerst deaktiviert: Der Org-Switcher zeigt die aktive Organisation nur noch
 * als nicht-interaktives Label (inkl. Branding), die Wechsel-Logik bleibt im
 * Code (`OrgSwitcher`, `switchOrganisation`). Zum Reaktivieren auf `true` setzen
 * — oder `NEXT_PUBLIC_ORG_SWITCHING=true` in der Umgebung setzen.
 */
export const ORG_SWITCHING_ENABLED =
  process.env.NEXT_PUBLIC_ORG_SWITCHING === "true";
