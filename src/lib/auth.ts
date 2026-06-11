// Server-side auth helpers for Server Components and Server Actions.
// Replaces the OLD APP's `requireSupabaseAuth` TanStack middleware.
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { Database } from "./supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export type SessionUser = {
  userId: string;
  email: string | null;
  roles: AppRole[];
  supabase: Awaited<ReturnType<typeof createClient>>;
};

/**
 * Returns the current session user + roles, or null if not signed in.
 * Cached per-request so multiple callers share one round-trip.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  return {
    userId: user.id,
    email: user.email ?? null,
    roles: (roleRows ?? []).map((r) => r.role),
    supabase,
  };
});

/** Throws UNAUTHORIZED if not signed in. Use at the top of protected server actions. */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

/** Throws FORBIDDEN if the user lacks all of the given roles. */
export async function requireRole(...allowed: AppRole[]): Promise<SessionUser> {
  const session = await requireUser();
  if (!session.roles.some((r) => allowed.includes(r))) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export const isKundeOnly = (roles: AppRole[]) =>
  roles.length > 0 && roles.every((r) => r === "kunde");
