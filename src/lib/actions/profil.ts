"use server";

// Server actions for the personal profile: update own profile fields and change
// own password. updateMyProfile uses the admin client scoped strictly to the
// caller's own id; changeMyPassword uses the AUTHED client (Supabase requires an
// active session to update the user's password).
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { passwordSchema } from "@/lib/password";

// Empty strings from the form become null.
const nullableStr = (max: number) =>
  z
    .string()
    .max(max)
    .transform((s) => {
      const t = s.trim();
      return t.length ? t : null;
    })
    .nullable()
    .optional();

const updateMyProfileInput = z.object({
  anrede: z.enum(["herr", "frau", "divers"]).nullable().optional(),
  vorname: nullableStr(120),
  nachname: nullableStr(120),
  phone: nullableStr(40),
  geburtsdatum: nullableStr(10), // yyyy-mm-dd
  address: nullableStr(200),
  plz: nullableStr(10),
  stadt: nullableStr(120),
  bundesland: nullableStr(120),
  persoenlicherSteuersatz: z.number().min(0).max(100).nullable().optional(),
});

export async function updateMyProfile(
  input: z.input<typeof updateMyProfileInput>,
) {
  const { userId } = await requireUser();
  const data = updateMyProfileInput.parse(input);
  const admin = createAdminClient();

  const vorname = data.vorname ?? null;
  const nachname = data.nachname ?? null;
  // Keep the display `name` consistent with vorname/nachname.
  const name = [vorname, nachname].filter(Boolean).join(" ") || null;

  const { error } = await admin
    .from("profiles")
    .update({
      anrede: data.anrede ?? null,
      vorname,
      nachname,
      name,
      phone: data.phone ?? null,
      geburtsdatum: data.geburtsdatum ?? null,
      address: data.address ?? null,
      plz: data.plz ?? null,
      stadt: data.stadt ?? null,
      bundesland: data.bundesland ?? null,
      persoenlicher_steuersatz: data.persoenlicherSteuersatz ?? null,
    })
    .eq("id", userId);
  if (error) {
    throw new Error(`Profil konnte nicht gespeichert werden: ${error.message}`);
  }

  revalidatePath("/profil");
  return { ok: true as const };
}

const changeMyPasswordInput = z.object({ password: passwordSchema });

export async function changeMyPassword(
  input: z.infer<typeof changeMyPasswordInput>,
) {
  const session = await requireUser();
  const { password } = changeMyPasswordInput.parse(input);

  // Password change requires the authed session (not the admin client).
  const { error } = await session.supabase.auth.updateUser({ password });
  if (error) {
    throw new Error(`Passwort konnte nicht geändert werden: ${error.message}`);
  }
  return { ok: true as const };
}
