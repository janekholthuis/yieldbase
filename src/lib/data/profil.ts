// Server-side data access for the personal profile (the signed-in user's own
// profiles row). Read via the authed client (RLS allows self-read).
import "server-only";
import { requireUser } from "@/lib/auth";
import type { AppRole } from "@/lib/auth";

export type Anrede = "herr" | "frau" | "divers";

export interface MyProfile {
  anrede: Anrede | null;
  vorname: string | null;
  nachname: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  geburtsdatum: string | null;
  address: string | null;
  plz: string | null;
  stadt: string | null;
  bundesland: string | null;
  persoenlicherSteuersatz: number | null;
  roles: AppRole[];
}

export async function getMyProfile(): Promise<MyProfile> {
  const session = await requireUser();
  const { data } = await session.supabase
    .from("profiles")
    .select(
      "anrede, vorname, nachname, name, email, phone, geburtsdatum, address, plz, stadt, bundesland, persoenlicher_steuersatz",
    )
    .eq("id", session.userId)
    .maybeSingle();

  return {
    anrede: (data?.anrede as Anrede | null) ?? null,
    vorname: data?.vorname ?? null,
    nachname: data?.nachname ?? null,
    name: data?.name ?? null,
    email: data?.email ?? session.email,
    phone: data?.phone ?? null,
    geburtsdatum: data?.geburtsdatum ?? null,
    address: data?.address ?? null,
    plz: data?.plz ?? null,
    stadt: data?.stadt ?? null,
    bundesland: data?.bundesland ?? null,
    persoenlicherSteuersatz:
      data?.persoenlicher_steuersatz == null
        ? null
        : Number(data.persoenlicher_steuersatz),
    roles: session.roles,
  };
}
