import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertOrgAccess, activeOrgId, type OrgGuardSession } from "./_org";

// BUG-001 regression: org-ownership guard for admin-client (RLS-bypassing) writes.

type AnyClient = SupabaseClient<never>;

/** Minimal authed-client stub whose profiles lookup yields `orgId`. */
function clientWithActiveOrg(orgId: string | null): AnyClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { active_organisation_id: orgId },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as AnyClient;
}

/** Client that fails the test if any query is issued (asserts the bypass path). */
function throwingClient(): AnyClient {
  return {
    from: () => {
      throw new Error("should not query the DB");
    },
  } as unknown as AnyClient;
}

const session = (
  roles: string[],
  supabase: AnyClient,
): OrgGuardSession =>
  ({
    supabase,
    userId: "user-1",
    roles: roles as OrgGuardSession["roles"],
  }) as OrgGuardSession;

describe("assertOrgAccess", () => {
  it("lets admins through without even querying the org", async () => {
    await expect(
      assertOrgAccess(session(["admin"], throwingClient()), "any-org"),
    ).resolves.toBeUndefined();
  });

  it("lets support through (cross-org platform access)", async () => {
    await expect(
      assertOrgAccess(session(["support"], throwingClient()), "any-org"),
    ).resolves.toBeUndefined();
  });

  it("allows a VP to act within their own active org", async () => {
    await expect(
      assertOrgAccess(session(["vp_l1"], clientWithActiveOrg("org-A")), "org-A"),
    ).resolves.toBeUndefined();
  });

  it("blocks a VP from touching another org's row", async () => {
    await expect(
      assertOrgAccess(session(["vp_l1"], clientWithActiveOrg("org-A")), "org-B"),
    ).rejects.toThrow("FORBIDDEN");
  });

  it("blocks a VP with no active org", async () => {
    await expect(
      assertOrgAccess(session(["vp_l2"], clientWithActiveOrg(null)), "org-A"),
    ).rejects.toThrow("FORBIDDEN");
  });

  it("blocks access to an orphaned row (null organisation_id) for non-admins", async () => {
    await expect(
      assertOrgAccess(session(["vertriebsleiter"], clientWithActiveOrg("org-A")), null),
    ).rejects.toThrow("FORBIDDEN");
  });

  it("treats a Vertriebsleiter like any other org-scoped role", async () => {
    await expect(
      assertOrgAccess(
        session(["vertriebsleiter"], clientWithActiveOrg("org-A")),
        "org-A",
      ),
    ).resolves.toBeUndefined();
  });
});

describe("activeOrgId", () => {
  it("returns the caller's active organisation id", async () => {
    expect(await activeOrgId(clientWithActiveOrg("org-X"), "user-1")).toBe(
      "org-X",
    );
  });

  it("returns null when no active org is set", async () => {
    expect(await activeOrgId(clientWithActiveOrg(null), "user-1")).toBeNull();
  });

  it("returns null when the profile row is missing", async () => {
    const noProfile = {
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) }),
        }),
      }),
    } as unknown as AnyClient;
    expect(await activeOrgId(noProfile, "user-1")).toBeNull();
  });
});
