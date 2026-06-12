"use server";

// Read/write the bank details used for the Reservierungsgebühr. These live on
// the `projekte` row. Both read and write go through the AUTHED cookie client,
// so per-org RLS (and the projekte update policy) is enforced automatically —
// no admin client / explicit org guard needed.
import { requireUser } from "@/lib/auth";

export interface ProjektBank {
  kontoinhaber: string | null;
  iban: string | null;
  bic: string | null;
}

export async function getProjektBank(projektId: string): Promise<ProjektBank> {
  const { supabase } = await requireUser();
  const { data } = await supabase
    .from("projekte")
    .select("bank_kontoinhaber, bank_iban, bank_bic")
    .eq("id", projektId)
    .maybeSingle();
  return {
    kontoinhaber: data?.bank_kontoinhaber ?? null,
    iban: data?.bank_iban ?? null,
    bic: data?.bank_bic ?? null,
  };
}

const norm = (s: string | null | undefined) => {
  const v = (s ?? "").trim();
  return v === "" ? null : v;
};

export async function updateProjektBank(input: {
  projektId: string;
  kontoinhaber: string | null;
  iban: string | null;
  bic: string | null;
}): Promise<void> {
  const { supabase } = await requireUser();

  const ibanRaw = norm(input.iban);
  const iban = ibanRaw ? ibanRaw.replace(/\s+/g, "").toUpperCase() : null;
  if (iban && !/^[A-Z]{2}[0-9A-Z]{13,32}$/.test(iban)) {
    throw new Error("Bitte eine gültige IBAN eingeben.");
  }
  const bic = norm(input.bic)?.toUpperCase() ?? null;
  if (bic && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(bic)) {
    throw new Error("Bitte eine gültige BIC eingeben (8 oder 11 Zeichen).");
  }

  const { error } = await supabase
    .from("projekte")
    .update({
      bank_kontoinhaber: norm(input.kontoinhaber),
      bank_iban: iban,
      bank_bic: bic,
    })
    .eq("id", input.projektId);
  if (error) throw new Error(error.message);
}
