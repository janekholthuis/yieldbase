import { describe, it, expect } from "vitest";
import { haversineMeters, formatDistance } from "./standort-highlights";

describe("haversineMeters", () => {
  it("is zero for identical points", () => {
    expect(haversineMeters([13.405, 52.52], [13.405, 52.52])).toBe(0);
  });

  it("matches a known Berlin↔Hamburg distance (~255 km)", () => {
    // Berlin (13.4050, 52.5200) → Hamburg (9.9937, 53.5511)
    const d = haversineMeters([13.405, 52.52], [9.9937, 53.5511]);
    expect(d).toBeGreaterThan(252_000);
    expect(d).toBeLessThan(258_000);
  });

  it("computes a short urban distance in the expected range", () => {
    // ~1 km apart in central Berlin
    const d = haversineMeters([13.405, 52.52], [13.405, 52.529]);
    expect(d).toBeGreaterThan(950);
    expect(d).toBeLessThan(1050);
  });

  it("is symmetric", () => {
    const a: [number, number] = [13.405, 52.52];
    const b: [number, number] = [9.9937, 53.5511];
    expect(haversineMeters(a, b)).toBeCloseTo(haversineMeters(b, a), 6);
  });
});

describe("formatDistance", () => {
  it("rounds metres below 1 km to the nearest 10 m", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(423)).toBe("420 m");
    expect(formatDistance(427)).toBe("430 m");
    expect(formatDistance(999)).toBe("1000 m");
  });

  it("switches to km with a German decimal comma at 1 km", () => {
    expect(formatDistance(1000)).toBe("1,0 km");
    expect(formatDistance(1234)).toBe("1,2 km");
    expect(formatDistance(25_500)).toBe("25,5 km");
  });
});
