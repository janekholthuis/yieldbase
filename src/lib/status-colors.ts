import type { BadgeProps } from "@/components/ui/badge";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/**
 * Zentrale Status-Mapping-Tabelle für Reservierungen, Objekte und Workflow-States.
 * Statt Inline-Farben/Klassen IMMER diese Map verwenden, damit Tonalität konsistent bleibt.
 */
export const reservationStatusVariant: Record<string, BadgeVariant> = {
  // Reservierungen
  offen: "default",
  open: "default",
  entwurf: "default",
  draft: "default",

  in_bearbeitung: "primary",
  in_progress: "primary",
  pruefung: "primary",
  review: "primary",

  angeboten: "accent",
  offered: "accent",
  reserviert: "accent",
  reserved: "accent",

  angenommen: "success",
  accepted: "success",
  bestaetigt: "success",
  confirmed: "success",
  notariell: "success",

  abgelehnt: "destructive",
  rejected: "destructive",
  storniert: "destructive",
  cancelled: "destructive",
  abgelaufen: "destructive",
  expired: "destructive",

  archiviert: "muted",
  archived: "muted",
};

export function getReservationStatusVariant(status: string | null | undefined): BadgeVariant {
  if (!status) return "default";
  return reservationStatusVariant[status.toLowerCase()] ?? "default";
}

export const objektStatusVariant: Record<string, BadgeVariant> = {
  verfuegbar: "success",
  available: "success",
  reserviert: "accent",
  reserved: "accent",
  verkauft: "muted",
  sold: "muted",
  inaktiv: "muted",
  inactive: "muted",
};

export function getObjektStatusVariant(status: string | null | undefined): BadgeVariant {
  if (!status) return "default";
  return objektStatusVariant[status.toLowerCase()] ?? "default";
}

export const provisionStatusVariant: Record<string, BadgeVariant> = {
  pipeline: "default",
  verdient: "primary",
  in_auszahlung: "accent",
  ausgezahlt: "success",
  storniert: "destructive",
};

export function getProvisionStatusVariant(status: string | null | undefined): BadgeVariant {
  if (!status) return "default";
  return provisionStatusVariant[status.toLowerCase()] ?? "default";
}
