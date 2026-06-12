"use server";

// Persist in-app feedback from internal users. RLS restricts inserts to the
// submitter; `titel` is derived from the description so the form stays minimal.
import { requireUser } from "@/lib/auth";

export type FeedbackKategorie =
  | "ui_ux"
  | "bug"
  | "feature"
  | "performance"
  | "sonstiges";

export async function submitFeedback(input: {
  kategorie: FeedbackKategorie;
  beschreibung: string;
}): Promise<void> {
  const { supabase, userId } = await requireUser();
  const beschreibung = input.beschreibung.trim();
  if (!beschreibung) throw new Error("Bitte gib eine Beschreibung ein.");
  const titel =
    beschreibung.length > 60
      ? beschreibung.slice(0, 57).trimEnd() + "…"
      : beschreibung;

  const { error } = await supabase.from("feedback").insert({
    submitter_id: userId,
    kategorie: input.kategorie,
    beschreibung,
    titel,
  });
  if (error) throw new Error(error.message);
}
