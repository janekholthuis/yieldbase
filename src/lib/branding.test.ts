import { describe, it, expect } from "vitest";
import {
  hexToRgbChannels,
  hexToOklchChannels,
  buildOrgThemeCss,
} from "./branding";

// PROJ-13: per-organisation theming (hex → CSS custom-property channels).

describe("hexToRgbChannels", () => {
  it("converts a 6-digit hex into space-separated RGB channels", () => {
    expect(hexToRgbChannels("#0A2E4F")).toBe("10 46 79");
    expect(hexToRgbChannels("#000000")).toBe("0 0 0");
    expect(hexToRgbChannels("#FFFFFF")).toBe("255 255 255");
  });

  it("tolerates a missing leading # and surrounding whitespace", () => {
    expect(hexToRgbChannels(" 0a2e4f ")).toBe("10 46 79");
  });

  it("returns null for malformed hex", () => {
    expect(hexToRgbChannels("#12")).toBeNull();
    expect(hexToRgbChannels("#GGGGGG")).toBeNull();
    expect(hexToRgbChannels("blue")).toBeNull();
  });
});

describe("hexToOklchChannels", () => {
  it("maps black to lightness ~0 and white to lightness ~1", () => {
    const black = hexToOklchChannels("#000000")!.split(" ").map(Number);
    const white = hexToOklchChannels("#FFFFFF")!.split(" ").map(Number);
    expect(black[0]).toBeCloseTo(0, 2);
    expect(white[0]).toBeCloseTo(1, 2);
  });

  it("emits three numeric L C H channels", () => {
    const parts = hexToOklchChannels("#0A2E4F")!.split(" ");
    expect(parts).toHaveLength(3);
    expect(parts.every((p) => Number.isFinite(Number(p)))).toBe(true);
  });

  it("returns null for malformed hex", () => {
    expect(hexToOklchChannels("nope")).toBeNull();
  });
});

describe("buildOrgThemeCss", () => {
  it("returns an empty string when no org is given", () => {
    expect(buildOrgThemeCss(null)).toBe("");
  });

  it("returns an empty string when the org has no custom colors", () => {
    expect(buildOrgThemeCss({ primaryColor: null, accentColor: null })).toBe("");
  });

  it("emits primary + brand-primary declarations for a primary color", () => {
    const css = buildOrgThemeCss({ primaryColor: "#0A2E4F", accentColor: null });
    expect(css).toMatch(/^:root\{/);
    expect(css).toContain("--primary:");
    expect(css).toContain("--brand-primary:10 46 79");
    expect(css).toContain("--ring:");
  });

  it("emits accent declarations for an accent color", () => {
    const css = buildOrgThemeCss({
      primaryColor: null,
      accentColor: "#FF8800",
    });
    expect(css).toContain("--accent:");
    expect(css).toContain("--brand-accent:255 136 0");
  });

  it("ignores a malformed color instead of producing broken CSS", () => {
    expect(buildOrgThemeCss({ primaryColor: "not-a-color", accentColor: null })).toBe(
      "",
    );
  });
});
