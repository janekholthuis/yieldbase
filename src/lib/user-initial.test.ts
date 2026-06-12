import { describe, it, expect } from "vitest";
import { getUserInitial } from "./user-initial";

// PROJ-2: avatar initial helper.

describe("getUserInitial", () => {
  it("prefers the first name", () => {
    expect(getUserInitial({ vorname: "Janek", name: "Holthuis", email: "x@y.de" })).toBe(
      "J",
    );
  });

  it("falls back to the first word of the full name", () => {
    expect(getUserInitial({ name: "Max Mustermann", email: "x@y.de" })).toBe("M");
  });

  it("falls back to the email", () => {
    expect(getUserInitial({ email: "zoe@example.com" })).toBe("Z");
  });

  it("returns '?' when nothing is available", () => {
    expect(getUserInitial({})).toBe("?");
    expect(getUserInitial({ vorname: null, name: null, email: null })).toBe("?");
  });

  it("always uppercases and returns exactly one char", () => {
    const init = getUserInitial({ vorname: "élodie" });
    expect(init).toBe("É");
    expect(init).toHaveLength(1);
  });

  it("ignores whitespace-only fields and steps to the next source", () => {
    expect(getUserInitial({ vorname: "   ", name: "Anna" })).toBe("A");
  });
});
