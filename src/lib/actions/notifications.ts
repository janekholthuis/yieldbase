"use server";

// Notifications for the signed-in user. RLS scopes rows to the owner; we also
// filter by user_id explicitly for clarity. Used by the topbar NotificationBell.
import { requireUser } from "@/lib/auth";
import type { NotificationItem } from "@/components/shell/NotificationBell";

export async function listMyNotifications(): Promise<NotificationItem[]> {
  const { supabase, userId } = await requireUser();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, titel, body, link, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return [];
  return (data ?? []) as NotificationItem[];
}

/** Mark the given notifications read (or all unread when no ids are passed). */
export async function markNotificationsRead(ids?: string[]): Promise<void> {
  const { supabase, userId } = await requireUser();
  let q = supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (ids && ids.length > 0) q = q.in("id", ids);
  await q;
}
