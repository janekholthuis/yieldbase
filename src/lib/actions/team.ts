"use server";

// Server actions for the Team module: adjust a sub-VP's commission rate within
// the caller's tree, and revoke pending invites. Authorisation is enforced via
// requireRole; mutations use the admin client (invites/hierarchy are not
// RLS-writable by ordinary VPs) after the caller's scope is verified.
//
// Sub-VP invitations go through `createInvite` (src/lib/actions/auth.ts), which
// owns the canonical who-may-invite-whom matrix and the sub ≤ parent commission
// cap. There is deliberately no separate, less-guarded invite path here.
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ──────────────────────────── updateVpCommissionRate ────────────────────────────
const updateVpCommissionRateInput = z.object({
  vpId: z.string().uuid(),
  commissionRate: z.number().min(0).max(100),
});

export async function updateVpCommissionRate(
  input: z.infer<typeof updateVpCommissionRateInput>,
) {
  const { userId, roles } = await requireRole("admin", "vertriebsleiter");
  const data = updateVpCommissionRateInput.parse(input);
  const admin = createAdminClient();

  // Scope check: the target VP must be within the caller's tree.
  const { data: target } = await admin
    .from("vp_hierarchy")
    .select("vp_id, vertriebsleiter_id, parent_vp_id")
    .eq("vp_id", data.vpId)
    .maybeSingle();
  if (!target) throw new Error("VP nicht gefunden");

  const isAdmin = roles.includes("admin");
  if (!isAdmin && target.vertriebsleiter_id !== userId) {
    throw new Error("VP liegt nicht in Ihrem Team");
  }

  // Commission cap: a sub-VP's rate may not exceed its upline's rate (mirrors the
  // sub ≤ parent rule enforced at invite time). Only applies when the VP has a
  // parent VP — a top-level L1 (parent_vp_id null) reports to a Vertriebsleiter,
  // who has no vp_hierarchy rate, so there is nothing to cap against.
  if (target.parent_vp_id) {
    const { data: parent } = await admin
      .from("vp_hierarchy")
      .select("commission_rate")
      .eq("vp_id", target.parent_vp_id)
      .maybeSingle();
    const parentRate = parent ? Number(parent.commission_rate) : null;
    if (parentRate != null && data.commissionRate > parentRate) {
      throw new Error(
        `Provisionssatz (${data.commissionRate} %) darf den Satz des übergeordneten VP (${parentRate} %) nicht übersteigen`,
      );
    }
  }

  const { error } = await admin
    .from("vp_hierarchy")
    .update({ commission_rate: data.commissionRate })
    .eq("vp_id", data.vpId);
  if (error) {
    throw new Error(`Provisionssatz konnte nicht aktualisiert werden: ${error.message}`);
  }

  revalidatePath("/team");
  return { ok: true as const };
}

// ──────────────────────────── revokeInvite ────────────────────────────
const revokeInviteInput = z.object({ inviteId: z.string().uuid() });

export async function revokeInvite(input: z.infer<typeof revokeInviteInput>) {
  const { userId } = await requireRole(
    "admin",
    "vertriebsleiter",
    "vp_l1",
    "vp_l2",
    "vp_l3",
  );
  const data = revokeInviteInput.parse(input);
  const admin = createAdminClient();

  // Only delete a pending invite the caller created.
  const { data: deleted, error } = await admin
    .from("invites")
    .delete()
    .eq("id", data.inviteId)
    .eq("invited_by", userId)
    .is("accepted_at", null)
    .select("id");
  if (error) {
    throw new Error(`Einladung konnte nicht zurückgezogen werden: ${error.message}`);
  }
  if (!deleted || deleted.length === 0) {
    throw new Error("Einladung nicht gefunden oder bereits angenommen");
  }

  revalidatePath("/team");
  return { ok: true as const };
}
