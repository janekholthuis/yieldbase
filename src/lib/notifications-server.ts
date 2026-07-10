import "server-only";

// Server-only Insert-Helfer für die notifications-Tabelle. Bewusst KEINE
// "use server"-Action (die Clients direkt aufrufen und spammen könnten),
// sondern ein interner Util: wird aus vertrauenswürdigem Server-Code
// aufgerufen (z. B. dem Selbstauskunft-Reminder-Cron, der keine Session hat).
//
// Ohne übergebenen Client wird ein frischer Admin-Client (Service-Role)
// erzeugt — dieser umgeht RLS, daher ausschließlich serverseitig verwenden.
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "./supabase/admin";
import type { Database, Json } from "./supabase/types";

export interface CreateNotificationInput {
  /** Auth-User, dem die Benachrichtigung gehört (notifications.user_id). */
  userId: string;
  /** Maschinenlesbarer Typ, z. B. "selbstauskunft_reminder". */
  typ: string;
  titel: string;
  body?: string | null;
  link?: string | null;
  meta?: Json;
}

/**
 * Legt genau eine notifications-Zeile an. Best-effort — wirft nicht, sondern
 * gibt ok:false + Fehlertext zurück (der Aufrufer, z. B. der Cron, soll den
 * Batch bei einem Einzelfehler nicht abbrechen).
 */
export async function createNotification(
  input: CreateNotificationInput,
  client?: SupabaseClient<Database>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const sb = client ?? createAdminClient();
    const { error } = await sb.from("notifications").insert({
      user_id: input.userId,
      typ: input.typ,
      titel: input.titel,
      body: input.body ?? null,
      link: input.link ?? null,
      ...(input.meta !== undefined ? { meta: input.meta } : {}),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
