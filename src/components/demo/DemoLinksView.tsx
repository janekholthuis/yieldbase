"use client";

// PROJ-24 — Admin/Support-Verwaltung der gebrandeten Lead-Demo-Links.
// Erstellen (mit Branding-Auto-Extraktion), Liste mit Kopier-/Öffnen-Aktionen,
// Tracking und Kill-Switch. Helle, seriöse, kantige UI (Brand-Tokens).
import * as React from "react";
import { toast } from "sonner";
import {
  Copy,
  ExternalLink,
  Power,
  Eye,
  Loader2,
  Sparkles,
  X,
  Plus,
  Link2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  extractDemoBranding,
  createDemoLink,
  listDemoLinks,
  setDemoLinkActive,
} from "@/lib/actions/demo-links";
import type { DemoLinkRow } from "@/lib/actions/demo-links";
import type { BrandingSuggestion } from "@/lib/branding-extract";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const dateFmt = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});
function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dateFmt.format(d);
}

function normalizeHexInput(v: string): string {
  let s = v.trim();
  if (!s) return "";
  if (!s.startsWith("#")) s = `#${s}`;
  return s.toUpperCase();
}

function publicUrl(origin: string, slug: string): string {
  return `${origin}/fuer/${slug}`;
}

export function DemoLinksView({ initialLinks }: { initialLinks: DemoLinkRow[] }) {
  const [links, setLinks] = React.useState<DemoLinkRow[]>(initialLinks);
  const [origin, setOrigin] = React.useState("");

  // --- Erstellen-Formular -------------------------------------------------
  const [company, setCompany] = React.useState("");
  const [website, setWebsite] = React.useState("");
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = React.useState("");
  const [accentColor, setAccentColor] = React.useState("");
  const [detected, setDetected] = React.useState<BrandingSuggestion["detected"] | null>(
    null,
  );

  const [extracting, setExtracting] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [createdLink, setCreatedLink] = React.useState<string | null>(null);

  // --- Listen-Aktionen ----------------------------------------------------
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Kopiert");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  }

  async function refreshLinks() {
    try {
      const next = await listDemoLinks();
      setLinks(next);
    } catch {
      /* nicht-kritisch: Liste bleibt im aktuellen Stand */
    }
  }

  async function handleExtract() {
    const url = website.trim();
    if (!url) {
      toast.error("Bitte zuerst eine Website-Adresse eingeben.");
      return;
    }
    setExtracting(true);
    try {
      const res = await extractDemoBranding({ url });
      setLogoUrl(res.logoUrl);
      if (res.primaryColor) setPrimaryColor(res.primaryColor.toUpperCase());
      if (res.accentColor) setAccentColor(res.accentColor.toUpperCase());
      setDetected(res.detected);
      const found = [
        res.detected.logo && "Logo",
        res.detected.primary && "Primärfarbe",
        res.detected.accent && "Akzentfarbe",
      ].filter(Boolean);
      if (found.length) {
        toast.success(`Branding geladen: ${found.join(", ")}`);
      } else {
        toast.message("Kein Branding erkannt — bitte manuell setzen.");
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Branding konnte nicht geladen werden.",
      );
    } finally {
      setExtracting(false);
    }
  }

  function resetForm() {
    setCompany("");
    setWebsite("");
    setLogoUrl(null);
    setPrimaryColor("");
    setAccentColor("");
    setDetected(null);
  }

  async function handleCreate() {
    const leadCompany = company.trim();
    if (leadCompany.length < 2) {
      toast.error("Bitte einen Firmennamen angeben.");
      return;
    }
    const primary = primaryColor.trim();
    const accent = accentColor.trim();
    if (primary && !HEX_RE.test(primary)) {
      toast.error("Primärfarbe ist kein gültiger Hex-Wert (#RRGGBB).");
      return;
    }
    if (accent && !HEX_RE.test(accent)) {
      toast.error("Akzentfarbe ist kein gültiger Hex-Wert (#RRGGBB).");
      return;
    }

    setCreating(true);
    setCreatedLink(null);
    try {
      const res = await createDemoLink({
        leadCompany,
        leadWebsite: website.trim() || undefined,
        logoUrl: logoUrl || undefined,
        primaryColor: primary || undefined,
        accentColor: accent || undefined,
      });
      if (res.ok) {
        const url = publicUrl(origin, res.slug);
        setCreatedLink(url);
        toast.success("Link erstellt");
        resetForm();
        await refreshLinks();
      } else {
        toast.error(res.error);
      }
    } catch {
      toast.error("Demo-Link konnte nicht erstellt werden.");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(row: DemoLinkRow) {
    setTogglingId(row.id);
    try {
      const res = await setDemoLinkActive({ id: row.id, active: !row.isActive });
      if (res.ok) {
        toast.success(row.isActive ? "Link deaktiviert" : "Link aktiviert");
        await refreshLinks();
      } else {
        toast.error("Status konnte nicht geändert werden.");
      }
    } catch {
      toast.error("Status konnte nicht geändert werden.");
    } finally {
      setTogglingId(null);
    }
  }

  const previewPrimary = HEX_RE.test(primaryColor.trim())
    ? primaryColor.trim()
    : "#000000";
  const previewAccent = HEX_RE.test(accentColor.trim())
    ? accentColor.trim()
    : "#000000";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 sm:px-6">
      {/* Kopf ---------------------------------------------------------------- */}
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-ink">
          Demo-Links
        </h1>
        <p className="max-w-2xl text-sm text-brand-body">
          Personalisierte, auf den Lead gebrandete Demo-Vorschauen für die Akquise.
          Gültig 30 Tage, jederzeit deaktivierbar.
        </p>
      </header>

      {/* Erstellen ----------------------------------------------------------- */}
      <Card className="rounded-none border border-brand-border shadow-none">
        <CardContent className="space-y-6 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-brand-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-ink">
              Neuen Demo-Link erstellen
            </h2>
          </div>

          {/* Basisfelder */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="demo-company" className="text-brand-body">
                Firmenname <span className="text-brand-danger">*</span>
              </Label>
              <Input
                id="demo-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Muster Vertrieb GmbH"
                className="rounded-[4px] border-brand-border"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="demo-website" className="text-brand-body">
                Website-URL <span className="text-brand-muted">(optional)</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="demo-website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="muster-vertrieb.de"
                  className="rounded-[4px] border-brand-border"
                  autoComplete="off"
                  inputMode="url"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExtract}
                  disabled={extracting || !website.trim()}
                  className="shrink-0 rounded-[4px] border-brand-border"
                >
                  {extracting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="ml-2 hidden sm:inline">Branding laden</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Branding-Vorschau (editierbar) */}
          <div className="space-y-4 border border-brand-border bg-brand-surfaceMuted p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">
              Branding (manuell überschreibbar)
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Logo */}
              <div className="space-y-2">
                <Label className="text-brand-body">Logo</Label>
                {logoUrl ? (
                  <div className="flex items-center gap-3 border border-brand-border bg-white p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Logo-Vorschau"
                      className="h-10 w-10 object-contain"
                    />
                    <span className="flex-1 truncate text-xs text-brand-muted">
                      {logoUrl}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setLogoUrl(null)}
                      aria-label="Logo entfernen"
                      className="h-7 w-7 shrink-0 rounded-[4px]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <Input
                    value=""
                    onChange={(e) => setLogoUrl(e.target.value.trim() || null)}
                    placeholder="https://… (Logo-URL)"
                    className="rounded-[4px] border-brand-border"
                    aria-label="Logo-URL"
                    autoComplete="off"
                  />
                )}
                {detected && !detected.logo ? (
                  <p className="text-xs text-brand-muted">
                    Kein Logo erkannt — URL manuell einfügbar.
                  </p>
                ) : null}
              </div>

              {/* Primärfarbe */}
              <div className="space-y-2">
                <Label htmlFor="demo-primary" className="text-brand-body">
                  Primärfarbe
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Primärfarbe wählen"
                    value={previewPrimary}
                    onChange={(e) => setPrimaryColor(e.target.value.toUpperCase())}
                    className="h-9 w-10 shrink-0 cursor-pointer border border-brand-border bg-white p-0"
                  />
                  <Input
                    id="demo-primary"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(normalizeHexInput(e.target.value))}
                    placeholder="#1A2B3C"
                    className="rounded-[4px] border-brand-border font-mono"
                    autoComplete="off"
                  />
                </div>
                {detected && !detected.primary ? (
                  <p className="text-xs text-brand-muted">Nicht erkannt.</p>
                ) : null}
              </div>

              {/* Akzentfarbe */}
              <div className="space-y-2">
                <Label htmlFor="demo-accent" className="text-brand-body">
                  Akzentfarbe
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Akzentfarbe wählen"
                    value={previewAccent}
                    onChange={(e) => setAccentColor(e.target.value.toUpperCase())}
                    className="h-9 w-10 shrink-0 cursor-pointer border border-brand-border bg-white p-0"
                  />
                  <Input
                    id="demo-accent"
                    value={accentColor}
                    onChange={(e) => setAccentColor(normalizeHexInput(e.target.value))}
                    placeholder="#C8A04E"
                    className="rounded-[4px] border-brand-border font-mono"
                    autoComplete="off"
                  />
                </div>
                {detected && !detected.accent ? (
                  <p className="text-xs text-brand-muted">Nicht erkannt.</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={handleCreate}
              disabled={creating || company.trim().length < 2}
              className="rounded-[4px] bg-brand-primary"
            >
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Demo-Link erstellen
            </Button>
          </div>

          {/* Fertiger Link */}
          {createdLink ? (
            <div className="flex flex-col gap-3 border border-brand-success/40 bg-brand-successSoft p-4 sm:flex-row sm:items-center">
              <Link2
                className="h-5 w-5 shrink-0 text-brand-success"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-success">
                  Demo-Link bereit
                </p>
                <p className="truncate font-mono text-sm text-brand-ink">
                  {createdLink}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(createdLink)}
                  className="rounded-[4px] border-brand-border"
                >
                  <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                  Kopieren
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-[4px] border-brand-border"
                >
                  <a href={createdLink} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                    Öffnen
                  </a>
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Liste --------------------------------------------------------------- */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-ink">
          Bestehende Links{" "}
          <span className="font-normal text-brand-muted">({links.length})</span>
        </h2>

        {links.length === 0 ? (
          <div className="border border-dashed border-brand-border bg-brand-surfaceMuted p-10 text-center">
            <Link2
              className="mx-auto mb-3 h-8 w-8 text-brand-muted"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-brand-body">
              Noch keine Demo-Links
            </p>
            <p className="mt-1 text-xs text-brand-muted">
              Erstelle oben deinen ersten gebrandeten Demo-Link für einen Lead.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {links.map((row) => {
              const url = publicUrl(origin, row.slug);
              return (
                <li
                  key={row.id}
                  className="border border-brand-border bg-white p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* Identität */}
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      {row.logoUrl ? (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-brand-border bg-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={row.logoUrl}
                            alt=""
                            className="h-9 w-9 object-contain"
                          />
                        </span>
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center border border-brand-border bg-brand-surfaceMuted text-sm font-semibold text-brand-muted">
                          {row.leadCompany.slice(0, 2).toUpperCase()}
                        </span>
                      )}

                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-brand-ink">
                            {row.leadCompany}
                          </span>
                          {row.isExpired ? (
                            <Badge variant="muted">Abgelaufen</Badge>
                          ) : row.isActive ? (
                            <Badge variant="success">Aktiv</Badge>
                          ) : (
                            <Badge variant="destructive">Deaktiviert</Badge>
                          )}
                          {/* Farb-Swatches */}
                          <span className="flex items-center gap-1">
                            {row.primaryColor ? (
                              <span
                                className="h-4 w-4 border border-brand-border"
                                style={{ backgroundColor: row.primaryColor }}
                                title={`Primär ${row.primaryColor}`}
                                aria-label={`Primärfarbe ${row.primaryColor}`}
                              />
                            ) : null}
                            {row.accentColor ? (
                              <span
                                className="h-4 w-4 border border-brand-border"
                                style={{ backgroundColor: row.accentColor }}
                                title={`Akzent ${row.accentColor}`}
                                aria-label={`Akzentfarbe ${row.accentColor}`}
                              />
                            ) : null}
                          </span>
                        </div>

                        {/* Öffentlicher Link */}
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="max-w-full truncate rounded-[4px] bg-brand-surfaceMuted px-2 py-1 text-xs text-brand-body">
                            {url}
                          </code>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => copyToClipboard(url)}
                            aria-label="Link kopieren"
                            className="h-7 w-7 rounded-[4px]"
                          >
                            <Copy className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            aria-label="Link öffnen"
                            className="h-7 w-7 rounded-[4px]"
                          >
                            <a href={url} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" aria-hidden="true" />
                            </a>
                          </Button>
                        </div>

                        {/* Tracking */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-brand-muted">
                          <span className="inline-flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            {row.openedCount}× geöffnet
                          </span>
                          <span>zuletzt {fmtDate(row.lastOpenedAt)}</span>
                          <span>erstellt {fmtDate(row.createdAt)}</span>
                          <span>läuft ab {fmtDate(row.expiresAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Kill-Switch */}
                    <div className="shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggle(row)}
                        disabled={togglingId === row.id || row.isExpired}
                        aria-label={row.isActive ? "Deaktivieren" : "Aktivieren"}
                        className="rounded-[4px] border-brand-border"
                      >
                        {togglingId === row.id ? (
                          <Loader2
                            className="mr-2 h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <Power className="mr-2 h-4 w-4" aria-hidden="true" />
                        )}
                        {row.isActive ? "Deaktivieren" : "Aktivieren"}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
