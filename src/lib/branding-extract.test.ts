import { describe, it, expect } from "vitest";
import {
  normalizeUrl,
  absoluteUrl,
  normalizeHex,
  hexToHsl,
  parseThemeColor,
  parseLogoCandidates,
  extractCssColors,
  pickBrandColors,
  buildSuggestion,
} from "./branding-extract";

describe("normalizeUrl", () => {
  it("ergänzt https:// wenn kein Schema", () => {
    expect(normalizeUrl("meinefirma.de")).toBe("https://meinefirma.de/");
  });
  it("behält bestehendes Schema + Pfad", () => {
    expect(normalizeUrl("http://x.de/pfad")).toBe("http://x.de/pfad");
  });
  it("wirft bei leer", () => {
    expect(() => normalizeUrl("  ")).toThrow();
  });
  it("lehnt nicht-http(s) ab", () => {
    expect(() => normalizeUrl("ftp://x.de")).toThrow();
  });
});

describe("normalizeHex", () => {
  it("kurz → lang", () => expect(normalizeHex("#abc")).toBe("#AABBCC"));
  it("lang uppercase", () => expect(normalizeHex("#0a2e4f")).toBe("#0A2E4F"));
  it("rgb()", () => expect(normalizeHex("rgb(10, 46, 79)")).toBe("#0A2E4F"));
  it("rgba()", () => expect(normalizeHex("rgba(184,137,62,0.5)")).toBe("#B8893E"));
  it("ungültig → null", () => expect(normalizeHex("nope")).toBeNull());
});

describe("hexToHsl", () => {
  it("weiß", () => expect(hexToHsl("#FFFFFF")?.l).toBeCloseTo(1, 2));
  it("schwarz", () => expect(hexToHsl("#000000")?.l).toBeCloseTo(0, 2));
});

describe("absoluteUrl", () => {
  it("relativ → absolut", () =>
    expect(absoluteUrl("/logo.png", "https://x.de/seite")).toBe(
      "https://x.de/logo.png",
    ));
  it("absolut bleibt", () =>
    expect(absoluteUrl("https://cdn.de/a.png", "https://x.de")).toBe(
      "https://cdn.de/a.png",
    ));
});

describe("parseThemeColor", () => {
  it("liest theme-color meta", () => {
    const html = `<head><meta name="theme-color" content="#0A2E4F"></head>`;
    expect(parseThemeColor(html)).toBe("#0A2E4F");
  });
  it("null ohne meta", () => expect(parseThemeColor("<head></head>")).toBeNull());
});

describe("parseLogoCandidates", () => {
  it("priorisiert <img> mit 'logo' vor favicon", () => {
    const html = `
      <head><link rel="icon" href="/favicon.ico"></head>
      <body><img src="/assets/logo.svg" alt="Firmenlogo"></body>`;
    const c = parseLogoCandidates(html, "https://x.de");
    expect(c[0]).toBe("https://x.de/assets/logo.svg");
  });
  it("og:image als Kandidat", () => {
    const html = `<head><meta property="og:image" content="https://cdn.de/og.png"></head>`;
    expect(parseLogoCandidates(html, "https://x.de")).toContain(
      "https://cdn.de/og.png",
    );
  });
  it("leer wenn nichts", () =>
    expect(parseLogoCandidates("<body></body>", "https://x.de")).toEqual([]));
});

describe("extractCssColors + pickBrandColors", () => {
  it("findet Hex/rgb-Farben", () => {
    const colors = extractCssColors(`a{color:#0A2E4F} b{background:rgb(184,137,62)}`);
    expect(colors).toContain("#0A2E4F");
    expect(colors).toContain("#B8893E");
  });
  it("theme-color wird Primärfarbe", () => {
    const { primary } = pickBrandColors({
      themeColor: "#0A2E4F",
      cssColors: ["#B8893E", "#B8893E"],
    });
    expect(primary).toBe("#0A2E4F");
  });
  it("ignoriert weiß/schwarz/grau als Markenfarbe", () => {
    const { primary } = pickBrandColors({
      themeColor: null,
      cssColors: ["#FFFFFF", "#000000", "#333333", "#B8893E", "#B8893E"],
    });
    expect(primary).toBe("#B8893E");
  });
});

describe("buildSuggestion", () => {
  it("liefert Logo + Farben + detected-Flags", () => {
    const html = `
      <head>
        <meta name="theme-color" content="#0A2E4F">
        <style>.btn{background:#B8893E}.btn:hover{background:#B8893E}</style>
      </head>
      <body><img src="/logo.png" alt="Logo"></body>`;
    const s = buildSuggestion(html, "https://x.de");
    expect(s.logoUrl).toBe("https://x.de/logo.png");
    expect(s.primaryColor).toBe("#0A2E4F");
    expect(s.accentColor).toBe("#B8893E");
    expect(s.detected).toEqual({ logo: true, primary: true, accent: true });
  });
});
