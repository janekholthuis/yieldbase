"use client";

// Settings UI for multi-tenant organisation branding & membership.
//
// Composes three cards:
//  1. Branding (owner/admin) — name, logo upload, primary/accent colors.
//  2. Mitglieder — list + remove (owner/admin).
//  3. Neue Organisation (admin / vertriebsleiter) — create dialog.
//
// Data arrives as props from the Server Component; every mutation goes through a
// `"use server"` action, followed by a toast and `router.refresh()`.
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Trash2,
  Loader2,
  UserPlus,
  RefreshCw,
  DatabaseZap,
  CheckCircle2,
  AlertCircle,
  Globe,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUpload } from "@/components/dokumente/FileUpload";
import { BrandingExtractDialog } from "@/components/organisation/BrandingExtractDialog";
import { rehostLogoFromUrl } from "@/lib/actions/branding-extract";
import { useAuth } from "@/lib/auth-context";
import type { ActiveOrg, OrganisationMember } from "@/lib/data/organisationen";
import {
  createOrganisation,
  removeOrganisationMember,
  updateOrganisationBranding,
  addOrgMemberByEmail,
} from "@/lib/actions/organisationen";
import {
  getInvestagonStatus,
  syncInvestagon,
  saveInvestagonCredentials,
  removeInvestagonCredentials,
  type InvestagonStatus,
} from "@/lib/actions/investagon";

type MemberRolle = "owner" | "admin" | "member";

const DEFAULT_PRIMARY = "#1e3a5f";
const DEFAULT_ACCENT = "#c8a04e";
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const ROLE_LABEL: Record<MemberRolle, string> = {
  owner: "Inhaber",
  admin: "Administrator",
  member: "Mitglied",
};

interface EinstellungenViewProps {
  activeOrg: ActiveOrg | null;
  activeRole: MemberRolle | null;
  members: OrganisationMember[];
}

export function EinstellungenView({
  activeOrg,
  activeRole,
  members,
}: EinstellungenViewProps) {
  const { roles } = useAuth();
  const canManageOrg = activeRole === "owner" || activeRole === "admin";
  const canCreateOrg =
    roles.includes("admin") || roles.includes("vertriebsleiter");
  const canSyncInvestagon = roles.includes("admin") || roles.includes("support");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-6">
      <header>
        <h1 className="text-2xl font-semibold text-brand-primary">
          Einstellungen
        </h1>
        <p className="mt-1 text-sm text-brand-muted">
          Verwalten Sie das Branding und die Mitglieder Ihrer Organisation.
        </p>
      </header>

      {!activeOrg ? (
        <Card className="rounded-xl">
          <CardContent className="py-10 text-center text-sm text-brand-muted">
            Keine aktive Organisation ausgewählt.
            {canCreateOrg
              ? " Erstellen Sie unten eine neue Organisation, um loszulegen."
              : ""}
          </CardContent>
        </Card>
      ) : (
        <>
          {canManageOrg ? (
            <BrandingCard org={activeOrg} />
          ) : (
            <Card className="rounded-xl">
              <CardHeader>
                <CardTitle className="text-base">Aktive Organisation</CardTitle>
                <CardDescription>{activeOrg.name}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-brand-muted">
                Sie haben keine Berechtigung, das Branding dieser Organisation zu
                bearbeiten.
              </CardContent>
            </Card>
          )}

          <MembersCard
            orgId={activeOrg.id}
            members={members}
            canManage={canManageOrg}
          />

          {canSyncInvestagon && <InvestagonSyncCard />}
        </>
      )}

      {canCreateOrg && <CreateOrgCard />}
    </div>
  );
}

// ───────────── Branding ─────────────

function BrandingCard({ org }: { org: ActiveOrg }) {
  const router = useRouter();
  const [name, setName] = useState(org.name);
  const [logoUrl, setLogoUrl] = useState<string | null>(org.logoUrl);
  const [primary, setPrimary] = useState(org.primaryColor ?? DEFAULT_PRIMARY);
  const [accent, setAccent] = useState(org.accentColor ?? DEFAULT_ACCENT);
  const [saving, setSaving] = useState(false);
  const [extractOpen, setExtractOpen] = useState(false);

  const primaryValid = HEX_RE.test(primary);
  const accentValid = HEX_RE.test(accent);
  const nameValid = name.trim().length >= 2;
  const canSave = nameValid && primaryValid && accentValid && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      await updateOrganisationBranding({
        orgId: org.id,
        name: name.trim(),
        logoUrl,
        primaryColor: primary,
        accentColor: accent,
      });
      toast.success("Branding gespeichert");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen";
      toast.error("Branding konnte nicht gespeichert werden", {
        description: msg,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-brand-primary" />
          Aktive Organisation — Branding
        </CardTitle>
        <CardDescription>
          Name, Logo und Markenfarben dieser Organisation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* PROJ-23 — Branding automatisch aus einer Website übernehmen */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed bg-muted/30 p-3">
          <div className="text-sm">
            <div className="font-medium">Branding automatisch übernehmen</div>
            <p className="text-xs text-muted-foreground">
              Website-Adresse eingeben — Logo &amp; Farben werden erkannt.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setExtractOpen(true)}>
            <Globe className="mr-2 h-4 w-4" /> Aus Website übernehmen
          </Button>
        </div>
        <BrandingExtractDialog
          open={extractOpen}
          onOpenChange={setExtractOpen}
          onApply={(s) => {
            if (s.primaryColor) setPrimary(s.primaryColor);
            if (s.accentColor) setAccent(s.accentColor);
            if (s.logoUrl) {
              // Sofort den Hotlink als Vorschau zeigen, dann serverseitig in den
              // Branding-Bucket re-hosten (kein Hotlinking / kein Brechen, wenn die
              // Quelle das Bild später entfernt). Bei Fehlschlag bleibt der Hotlink.
              setLogoUrl(s.logoUrl);
              void rehostLogoFromUrl({ orgId: org.id, sourceUrl: s.logoUrl })
                .then((r) => {
                  if (r.rehosted) setLogoUrl(r.logoUrl);
                })
                .catch(() => {
                  /* graceful: Hotlink bleibt gesetzt */
                });
            }
          }}
        />

        <div className="space-y-2">
          <Label htmlFor="org-name">Name</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Organisationsname"
          />
          {!nameValid && (
            <p className="text-xs text-destructive">
              Mindestens 2 Zeichen erforderlich.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Logo</Label>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 rounded-lg">
              {logoUrl ? (
                <AvatarImage
                  src={logoUrl}
                  alt={`${name} Logo`}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="rounded-lg bg-brand-primaryTint text-brand-primary">
                {name.trim().charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <FileUpload
                bucket="objekt-bilder"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                acceptedMime={["image/jpeg", "image/png"]}
                label="Logo hochladen (JPG / PNG)"
                buildPath={({ safeName, id }) =>
                  `org-logos/${org.id}/${id}-${safeName}`
                }
                onUploaded={async (meta) => {
                  if (meta.publicUrl) setLogoUrl(meta.publicUrl);
                }}
              />
            </div>
          </div>
          {logoUrl && (
            <button
              type="button"
              onClick={() => setLogoUrl(null)}
              className="text-xs text-brand-muted underline-offset-2 hover:underline"
            >
              Logo entfernen
            </button>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <ColorField
            id="org-primary"
            label="Primärfarbe"
            value={primary}
            onChange={setPrimary}
            valid={primaryValid}
          />
          <ColorField
            id="org-accent"
            label="Akzentfarbe"
            value={accent}
            onChange={setAccent}
            valid={accentValid}
          />
        </div>

        {/* Live swatch preview */}
        <div className="space-y-2">
          <Label>Vorschau</Label>
          <div className="flex items-center gap-3 rounded-lg border border-brand-border bg-brand-surface p-3">
            <span
              className="h-8 w-8 rounded-md border border-brand-border"
              style={{ backgroundColor: primaryValid ? primary : undefined }}
              aria-label="Primärfarbe"
            />
            <span
              className="h-8 w-8 rounded-md border border-brand-border"
              style={{ backgroundColor: accentValid ? accent : undefined }}
              aria-label="Akzentfarbe"
            />
            <span className="text-sm text-brand-muted">
              {primary.toUpperCase()} · {accent.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!canSave}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
  valid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  valid: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} Farbwähler`}
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-md border border-brand-border bg-brand-surface p-1"
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#RRGGBB"
          maxLength={7}
          className="font-mono"
        />
      </div>
      {!valid && (
        <p className="text-xs text-destructive">Format: #RRGGBB</p>
      )}
    </div>
  );
}

// ───────────── Mitglieder ─────────────

function MembersCard({
  orgId,
  members,
  canManage,
}: {
  orgId: string;
  members: OrganisationMember[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [removing, setRemoving] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [rolle, setRolle] = useState<"member" | "admin">("member");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const e = email.trim();
    if (!e) {
      toast.error("Bitte eine E-Mail angeben");
      return;
    }
    setAdding(true);
    try {
      const res = await addOrgMemberByEmail({ orgId, email: e, rolle });
      toast.success(`${res.name ?? res.email} hinzugefügt`);
      setEmail("");
      setRolle("member");
      router.refresh();
    } catch (err) {
      toast.error("Mitglied konnte nicht hinzugefügt werden", {
        description: err instanceof Error ? err.message : "Fehlgeschlagen",
      });
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(userId: string) {
    setRemoving(userId);
    try {
      await removeOrganisationMember({ orgId, userId });
      toast.success("Mitglied entfernt");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Entfernen fehlgeschlagen";
      toast.error("Mitglied konnte nicht entfernt werden", {
        description: msg,
      });
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-base">Mitglieder</CardTitle>
        <CardDescription>
          {members.length === 1
            ? "1 Mitglied"
            : `${members.length} Mitglieder`}
          {canManage
            ? " — Inhaber/Administratoren können Mitglieder entfernen."
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="py-6 text-center text-sm text-brand-muted">
            Keine Mitglieder gefunden.
          </p>
        ) : (
          <ul className="divide-y divide-brand-border">
            {members.map((m) => {
              const display = m.name ?? m.email ?? "Unbekannt";
              const isBusy = removing === m.userId;
              return (
                <li
                  key={m.userId}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primaryTint text-xs font-semibold text-brand-primary">
                    {display.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-brand-primary">
                      {display}
                    </div>
                    {m.email && m.name && (
                      <div className="truncate text-xs text-brand-muted">
                        {m.email}
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {ROLE_LABEL[m.rolle]}
                  </Badge>
                  {canManage && m.rolle !== "owner" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`${display} entfernen`}
                      disabled={isBusy}
                      onClick={() => handleRemove(m.userId)}
                      className="shrink-0 text-brand-muted hover:text-destructive"
                    >
                      {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {canManage && (
          <div className="mt-4 space-y-2 border-t border-brand-border pt-4">
            <Label htmlFor="add-member-email" className="text-sm font-medium">
              Mitglied hinzufügen
            </Label>
            <p className="text-xs text-brand-muted">
              Bestehende Nutzer per E-Mail zur Organisation hinzufügen. Für neue
              Personen die Einladung im Bereich „Mein Team“ nutzen.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="add-member-email"
                type="email"
                placeholder="name@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Select
                value={rolle}
                onValueChange={(v) => setRolle(v as "member" | "admin")}
              >
                <SelectTrigger className="w-full sm:w-40" aria-label="Rolle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Mitglied</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAdd} disabled={adding}>
                {adding ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-1 h-4 w-4" />
                )}
                Hinzufügen
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ───────────── Investagon-Sync (admin/support) ─────────────

const DATE_FMT = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : DATE_FMT.format(d);
}

async function runSyncRoute(full: boolean): Promise<{
  projects: number;
  properties: number;
  photos: number;
  documents: number;
}> {
  const res = await fetch("/api/investagon/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ full }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error ?? "Synchronisierung fehlgeschlagen");
  return json;
}

function InvestagonSyncCard() {
  const [status, setStatus] = useState<InvestagonStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [fullSyncing, setFullSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [apiKey, setApiKey] = useState("");

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await getInvestagonStatus());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const last = status?.lastSync ?? null;
  const hasCreds = status?.hasCredentials ?? false;

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await syncInvestagon({ incremental: true });
      toast.success("Abgleich abgeschlossen", {
        description: `${res.projects} Projekte · ${res.properties} Einheiten · ${res.photos} Fotos · ${res.documents} Dokumente`,
      });
      await loadStatus();
    } catch (e) {
      toast.error("Abgleich fehlgeschlagen", {
        description: e instanceof Error ? e.message : "Unbekannter Fehler",
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleFullSync() {
    setFullSyncing(true);
    try {
      const res = await runSyncRoute(true);
      toast.success("Vollständige Synchronisierung abgeschlossen", {
        description: `${res.projects} Projekte · ${res.properties} Einheiten · ${res.photos} Fotos · ${res.documents} Dokumente`,
      });
      await loadStatus();
    } catch (e) {
      toast.error("Synchronisierung fehlgeschlagen", {
        description: e instanceof Error ? e.message : "Unbekannter Fehler",
      });
    } finally {
      setFullSyncing(false);
    }
  }

  async function handleConnect() {
    if (!orgId.trim() || !apiKey.trim() || connecting) return;
    setConnecting(true);
    try {
      await saveInvestagonCredentials({
        organizationId: orgId.trim(),
        apiKey: apiKey.trim(),
      });
      toast.success("Verbunden", {
        description: "Erstsynchronisierung wird gestartet – das kann einige Minuten dauern.",
      });
      setApiKey("");
      await loadStatus();
      // Kick off the initial full backfill right away.
      setFullSyncing(true);
      try {
        const res = await runSyncRoute(true);
        toast.success("Erstsynchronisierung abgeschlossen", {
          description: `${res.projects} Projekte · ${res.properties} Einheiten · ${res.photos} Fotos · ${res.documents} Dokumente`,
        });
        await loadStatus();
      } catch (e) {
        toast.error("Erstsynchronisierung fehlgeschlagen", {
          description: e instanceof Error ? e.message : "Bitte später erneut versuchen.",
        });
      } finally {
        setFullSyncing(false);
      }
    } catch (e) {
      toast.error("Verbindung fehlgeschlagen", {
        description: e instanceof Error ? e.message : "Bitte Zugangsdaten prüfen.",
      });
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (
      !window.confirm(
        "Investagon-Verbindung trennen? Bereits synchronisierte Daten bleiben erhalten.",
      )
    )
      return;
    try {
      await removeInvestagonCredentials();
      toast.success("Verbindung getrennt");
      setOrgId("");
      setApiKey("");
      await loadStatus();
    } catch (e) {
      toast.error("Trennen fehlgeschlagen", {
        description: e instanceof Error ? e.message : "Unbekannter Fehler",
      });
    }
  }

  const busy = syncing || fullSyncing || connecting;

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DatabaseZap className="h-4 w-4 text-brand-primary" />
          Investagon-Synchronisierung
        </CardTitle>
        <CardDescription>
          Projekte, Einheiten, Fotos und Dokumente automatisch aus Investagon
          übernehmen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-brand-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Status wird geladen …
          </div>
        ) : !hasCreds ? (
          /* ── Onboarding: Zugangsdaten eingeben ── */
          <div className="space-y-4">
            <p className="text-sm text-brand-muted">
              Verbinde dein Investagon-Konto. Den API-Key findest du in Investagon
              unter <strong>Verwaltung → Add-Ons → Open-API</strong>.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="iv-org-id">Organisation-ID</Label>
              <Input
                id="iv-org-id"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="organization_id"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="iv-api-key">API-Key</Label>
              <Input
                id="iv-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="api_key"
                autoComplete="off"
                className="font-mono"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleConnect}
                disabled={!orgId.trim() || !apiKey.trim() || busy}
              >
                {connecting || fullSyncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <DatabaseZap className="mr-2 h-4 w-4" />
                )}
                {fullSyncing ? "Synchronisiere …" : "Verbinden & synchronisieren"}
              </Button>
            </div>
          </div>
        ) : (
          /* ── Verbunden: Status + Sync ── */
          <>
            <div className="rounded-lg border border-brand-border bg-brand-surface p-3 text-sm">
              <div className="mb-2 flex items-center gap-2 font-medium text-brand-primary">
                {last?.status === "success" ? (
                  <CheckCircle2 className="h-4 w-4 text-brand-success" />
                ) : last?.status === "error" ? (
                  <AlertCircle className="h-4 w-4 text-destructive" />
                ) : last?.status === "running" || fullSyncing || syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-brand-success" />
                )}
                {fullSyncing || syncing
                  ? "Synchronisierung läuft …"
                  : last
                    ? `Letzter Lauf: ${
                        last.status === "success"
                          ? "erfolgreich"
                          : last.status === "error"
                            ? "fehlgeschlagen"
                            : (last.status ?? "—")
                      }`
                    : "Verbunden – noch keine Synchronisierung durchgeführt."}
              </div>
              {last && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-brand-muted">
                  <dt>Zeitpunkt</dt>
                  <dd className="text-right tabular-nums text-brand-primary">
                    {formatDateTime(last.finishedAt ?? last.startedAt)}
                  </dd>
                  <dt>Projekte</dt>
                  <dd className="text-right tabular-nums text-brand-primary">
                    {last.projectsSynced ?? "—"}
                  </dd>
                  <dt>Einheiten</dt>
                  <dd className="text-right tabular-nums text-brand-primary">
                    {last.propertiesSynced ?? "—"}
                  </dd>
                </dl>
              )}
              {last?.status === "error" && last.error && (
                <p className="mt-2 break-words text-xs text-destructive">
                  {last.error}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={busy}
                className="text-brand-muted hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Verbindung trennen
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleFullSync}
                  disabled={busy}
                >
                  {fullSyncing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <DatabaseZap className="mr-2 h-4 w-4" />
                  )}
                  Vollständig
                </Button>
                <Button onClick={handleSync} disabled={busy}>
                  {syncing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Abgleichen
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ───────────── Neue Organisation ─────────────

function CreateOrgCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [primary, setPrimary] = useState(DEFAULT_PRIMARY);
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [creating, setCreating] = useState(false);
  const [extractOpen, setExtractOpen] = useState(false);

  const primaryValid = HEX_RE.test(primary);
  const accentValid = HEX_RE.test(accent);
  const nameValid = name.trim().length >= 2;
  const canCreate = nameValid && primaryValid && accentValid && !creating;

  function reset() {
    setName("");
    setLogoUrl(null);
    setPrimary(DEFAULT_PRIMARY);
    setAccent(DEFAULT_ACCENT);
  }

  async function handleCreate() {
    if (!canCreate) return;
    setCreating(true);
    try {
      // Org zuerst (mit dem extrahierten Hotlink als initialem Logo) anlegen, dann
      // — sobald die Org-ID existiert — das Logo serverseitig in den Branding-Bucket
      // re-hosten und die Bucket-URL nachziehen. Schlägt das Re-Hosting fehl, bleibt
      // der Hotlink bestehen (Flow bricht nie).
      const created = await createOrganisation({
        name: name.trim(),
        logoUrl,
        primaryColor: primary,
        accentColor: accent,
      });
      if (logoUrl) {
        try {
          const r = await rehostLogoFromUrl({
            orgId: created.id,
            sourceUrl: logoUrl,
          });
          if (r.rehosted) {
            await updateOrganisationBranding({
              orgId: created.id,
              logoUrl: r.logoUrl,
            });
          }
        } catch {
          /* graceful: initialer Hotlink bleibt am Org-Datensatz */
        }
      }
      toast.success("Organisation erstellt");
      setOpen(false);
      reset();
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erstellen fehlgeschlagen";
      toast.error("Organisation konnte nicht erstellt werden", {
        description: msg,
      });
    } finally {
      setCreating(false);
    }
  }

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="text-base">Neue Organisation</CardTitle>
        <CardDescription>
          Erstellen Sie eine weitere Organisation. Sie werden automatisch deren
          Inhaber und aktive Organisation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Organisation erstellen
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-xl">
            <DialogHeader>
              <DialogTitle>Neue Organisation</DialogTitle>
              <DialogDescription>
                Geben Sie einen Namen und optional Markenfarben an.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setExtractOpen(true)}
              >
                <Globe className="mr-2 h-4 w-4" /> Branding aus Website übernehmen
              </Button>
              <BrandingExtractDialog
                open={extractOpen}
                onOpenChange={setExtractOpen}
                onApply={(s) => {
                  if (s.primaryColor) setPrimary(s.primaryColor);
                  if (s.accentColor) setAccent(s.accentColor);
                  // Logo als Hotlink vormerken — re-gehostet wird es nach dem
                  // Anlegen (dann existiert die Org-ID), siehe handleCreate.
                  if (s.logoUrl) setLogoUrl(s.logoUrl);
                }}
              />
              {logoUrl && (
                <div className="flex items-center gap-3 rounded-lg border border-brand-border bg-brand-surface p-3">
                  <Avatar className="h-10 w-10 rounded-lg">
                    <AvatarImage
                      src={logoUrl}
                      alt="Logo-Vorschau"
                      className="object-contain"
                    />
                    <AvatarFallback className="rounded-lg bg-brand-primaryTint text-brand-primary">
                      {name.trim().charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm text-brand-muted">
                    Logo erkannt
                  </span>
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    className="text-xs text-brand-muted underline-offset-2 hover:underline"
                  >
                    Entfernen
                  </button>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="new-org-name">Name</Label>
                <Input
                  id="new-org-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z. B. Muster Vertrieb GmbH"
                  autoFocus
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField
                  id="new-org-primary"
                  label="Primärfarbe"
                  value={primary}
                  onChange={setPrimary}
                  valid={primaryValid}
                />
                <ColorField
                  id="new-org-accent"
                  label="Akzentfarbe"
                  value={accent}
                  onChange={setAccent}
                  valid={accentValid}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={creating}
              >
                Abbrechen
              </Button>
              <Button onClick={handleCreate} disabled={!canCreate}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Erstellen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
