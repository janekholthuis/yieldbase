// Shared types for the Objekte actions. Kept out of the "use server" action
// file (which may only export async functions). Ported from the OLD APP
// empfehlungen/praesentation serverFns.
import type { ObjektListItem } from "@/lib/data/objekte";

export interface EmpfehlungItem extends ObjektListItem {
  score: number; // 0..100+
  reason: string;
}

export interface KundeZuweisungItem {
  id: string;
  einheit_id: string;
  status: string;
  created_at: string;
  einheit: {
    id: string;
    wohnungsnummer: string;
    kaufpreis: number | null;
    projekt_name: string | null;
    stadt: string | null;
    cover_image_url: string | null;
  } | null;
}

export interface KalkulationListItem {
  id: string;
  einheit_id: string;
  created_at: string;
}

export interface VPProfile {
  id: string;
  name: string | null;
  vorname: string | null;
  nachname: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  branding_color: string | null;
  branding_logo_url: string | null;
}
