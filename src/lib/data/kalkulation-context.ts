// Server-side read of the calculation defaults + personal tax rate for the
// signed-in VP. RLS is enforced as the signed-in user via the cookie Supabase
// client. Ported from the OLD APP TanStack serverFn getKalkulationsContext.
import "server-only";
import { requireUser } from "@/lib/auth";
import { FALLBACK_DEFAULTS, type CalcDefaults } from "@/lib/kalkulation";

export interface KalkulationsContext {
  defaults: CalcDefaults;
  meinSteuersatz: number | null; // aus profile.persoenlicher_steuersatz
}

export async function getKalkulationsContext(): Promise<KalkulationsContext> {
  const { supabase, userId } = await requireUser();

  const [adminR, profileR] = await Promise.all([
    supabase
      .from("admin_kalkulations_defaults")
      .select(
        "standard_zins, standard_tilgung, standard_haltedauer, standard_afa, standard_ek_prozent, standard_wertsteigerung",
      )
      .eq("id", true)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("persoenlicher_steuersatz, kalkulations_defaults")
      .eq("id", userId)
      .maybeSingle(),
  ]);

   
  const a = adminR.data as any;
   
  const p = profileR.data as any;
  const vp = (p?.kalkulations_defaults ?? {}) as Partial<CalcDefaults>;

  const defaults: CalcDefaults = {
    zins: vp.zins ?? a?.standard_zins ?? FALLBACK_DEFAULTS.zins,
    tilgung: vp.tilgung ?? a?.standard_tilgung ?? FALLBACK_DEFAULTS.tilgung,
    haltedauer:
      vp.haltedauer ?? a?.standard_haltedauer ?? FALLBACK_DEFAULTS.haltedauer,
    afa: vp.afa ?? a?.standard_afa ?? FALLBACK_DEFAULTS.afa,
    ekProzent:
      vp.ekProzent ?? a?.standard_ek_prozent ?? FALLBACK_DEFAULTS.ekProzent,
    wertsteigerung:
      vp.wertsteigerung ??
      a?.standard_wertsteigerung ??
      FALLBACK_DEFAULTS.wertsteigerung,
  };

  return {
    defaults,
    meinSteuersatz: p?.persoenlicher_steuersatz ?? null,
  };
}
