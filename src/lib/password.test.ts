import { describe, it, expect } from "vitest";
import { passwordSchema, passwordChecks } from "./password";

// PROJ-1: password policy (set/reset password).

describe("passwordSchema", () => {
  it("accepts a password meeting all rules", () => {
    expect(passwordSchema.safeParse("Abcdefghij1").success).toBe(true);
  });

  it("rejects passwords shorter than 10 chars", () => {
    expect(passwordSchema.safeParse("Abcdef1g").success).toBe(false);
  });

  it("requires an uppercase letter", () => {
    expect(passwordSchema.safeParse("abcdefghij1").success).toBe(false);
  });

  it("requires a lowercase letter", () => {
    expect(passwordSchema.safeParse("ABCDEFGHIJ1").success).toBe(false);
  });

  it("requires a digit", () => {
    expect(passwordSchema.safeParse("Abcdefghijk").success).toBe(false);
  });
});

describe("passwordChecks", () => {
  it("reports every rule as satisfied for a strong password", () => {
    const checks = passwordChecks("Abcdefghij1");
    expect(checks.every((c) => c.ok)).toBe(true);
    expect(checks).toHaveLength(4);
  });

  it("flags the individual failing rules", () => {
    const checks = passwordChecks("abc");
    expect(checks[0].ok).toBe(false); // length
    expect(checks[1].ok).toBe(false); // uppercase
    expect(checks[2].ok).toBe(true); // lowercase
    expect(checks[3].ok).toBe(false); // digit
  });

  it("treats the empty string as all-failing", () => {
    expect(passwordChecks("").every((c) => !c.ok)).toBe(true);
  });
});
