import { describe, it, expect } from "vitest";
import {
  ENTITLEMENT_CATALOG,
  resolveEntitlements,
  hasEntitlement,
  type EntitlementOverrides,
} from "./entitlements";

describe("entitlements", () => {
  it("falls back to catalog defaults when no overrides", () => {
    const e = resolveEntitlements(null);
    expect(e.finanzierungen).toBe(true); // live feature defaults on
    expect(e.suchagenten).toBe(false); // custom feature defaults off
    expect(Object.keys(e).length).toBe(ENTITLEMENT_CATALOG.length);
  });

  it("applies overrides on top of defaults", () => {
    const overrides: EntitlementOverrides = {
      finanzierungen: false,
      suchagenten: true,
    };
    const e = resolveEntitlements(overrides);
    expect(e.finanzierungen).toBe(false);
    expect(e.suchagenten).toBe(true);
    expect(e.provisionen).toBe(true); // untouched -> default
  });

  it("ignores unknown/garbage keys in stored jsonb", () => {
    const overrides = { bogus: true, finanzierungen: false } as EntitlementOverrides;
    const e = resolveEntitlements(overrides);
    expect(e.finanzierungen).toBe(false);
    expect("bogus" in e).toBe(false);
  });

  it("ignores non-boolean override values", () => {
    const overrides = { ki: "yes" } as unknown as EntitlementOverrides;
    const e = resolveEntitlements(overrides);
    expect(e.ki).toBe(true); // falls back to default, not coerced
  });

  it("hasEntitlement works with raw overrides and null", () => {
    expect(hasEntitlement(null, "finanzierungen")).toBe(true);
    expect(hasEntitlement({ finanzierungen: false }, "finanzierungen")).toBe(false);
    expect(hasEntitlement({ integrationen: true }, "integrationen")).toBe(true);
    expect(hasEntitlement(undefined, "integrationen")).toBe(false);
  });
});
