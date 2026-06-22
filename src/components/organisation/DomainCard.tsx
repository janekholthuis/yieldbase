"use client";

// PROJ-30 — Eigene Domain mit der Organisation verbinden (Self-Service via
// Vercel-API). Zeigt Status, die zu setzenden DNS-Records und einen Verify-Knopf.
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Globe,
  Loader2,
  CheckCircle2,
  Clock,
  Trash2,
  RefreshCw,
  Copy,
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
import {
  connectOrgDomain,
  getOrgDomainStatus,
  verifyOrgDomain,
  disconnectOrgDomain,
  type DomainStatus,
} from "@/lib/actions/domains";

const msg = (e: unknown) => (e instanceof Error ? e.message : "Fehlgeschlagen");

export function DomainCard({ orgId }: { orgId: string }) {
  const [status, setStatus] = useState<DomainStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await getOrgDomainStatus({ orgId }));
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleConnect() {
    const d = domain.trim().toLowerCase();
    if (!d || busy) return;
    setBusy(true);
    try {
      const s = await connectOrgDomain({ orgId, domain: d });
      setStatus(s);
      setDomain("");
      toast.success("Domain verbunden", {
        description: "Jetzt die DNS-Records beim Domain-Anbieter setzen.",
      });
    } catch (e) {
      toast.error("Verbinden fehlgeschlagen", { description: msg(e) });
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify() {
    if (busy) return;
    setBusy(true);
    try {
      const s = await verifyOrgDomain({ orgId });
      setStatus(s);
      if (s.verified) toast.success("Domain verifiziert ✓");
      else
        toast.message("Noch nicht verifiziert", {
          description: "DNS-Änderungen können bis zu 48 h brauchen.",
        });
    } catch (e) {
      toast.error("Prüfen fehlgeschlagen", { description: msg(e) });
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (busy) return;
    if (!window.confirm("Domain von dieser Organisation trennen?")) return;
    setBusy(true);
    try {
      const s = await disconnectOrgDomain({ orgId });
      setStatus(s);
      toast.success("Domain getrennt");
    } catch (e) {
      toast.error("Trennen fehlgeschlagen", { description: msg(e) });
    } finally {
      setBusy(false);
    }
  }

  function copy(value: string) {
    void navigator.clipboard?.writeText(value);
    toast.success("Kopiert");
  }

  const hasDomain = !!status?.domain;
  const configured = status?.configured ?? true;

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4 text-brand-primary" />
          Eigene Domain
        </CardTitle>
        <CardDescription>
          Verbinde eine eigene Domain — die App läuft dann gebrandet auf deiner
          Adresse.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-brand-muted">
            <Loader2 className="h-4 w-4 animate-spin" /> Status wird geladen …
          </div>
        ) : !hasDomain ? (
          <div className="space-y-2">
            <Label htmlFor="org-domain">Domain</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="org-domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="z. B. meine-firma.de"
                autoComplete="off"
                className="flex-1"
              />
              <Button onClick={handleConnect} disabled={!domain.trim() || busy}>
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="mr-2 h-4 w-4" />
                )}
                Verbinden
              </Button>
            </div>
            {!configured && (
              <p className="text-xs text-brand-muted">
                Hinweis: Die automatische Domain-Verbindung ist serverseitig nicht
                konfiguriert (kein Vercel-Token) — lokal nicht testbar.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status-Zeile */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-border bg-brand-surface p-3">
              <div className="flex items-center gap-2 text-sm font-medium text-brand-primary">
                <Globe className="h-4 w-4" />
                {status!.domain}
              </div>
              {status!.verified ? (
                <Badge className="gap-1 bg-success-soft text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verifiziert
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3.5 w-3.5" /> Ausstehend
                </Badge>
              )}
            </div>

            {/* DNS-Anleitung, solange nicht verifiziert */}
            {!status!.verified && (
              <div className="space-y-2">
                <p className="text-sm text-brand-muted">
                  Setze beim Domain-Anbieter folgende DNS-Records, dann auf „Jetzt
                  prüfen“ klicken:
                </p>
                <div className="overflow-hidden rounded-lg border border-brand-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 text-xs uppercase text-brand-muted">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Typ</th>
                        <th className="px-3 py-2 text-left font-medium">Name</th>
                        <th className="px-3 py-2 text-left font-medium">Wert</th>
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {status!.records.map((r, i) => (
                        <tr key={i} className="border-t border-brand-border">
                          <td className="px-3 py-2 font-mono">{r.type}</td>
                          <td className="px-3 py-2 font-mono">{r.name}</td>
                          <td className="px-3 py-2 font-mono">{r.value}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              aria-label="Wert kopieren"
                              onClick={() => copy(r.value)}
                              className="text-brand-muted hover:text-brand-primary"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {status!.verification.length > 0 && (
                  <p className="text-xs text-brand-muted">
                    Zusätzlich verlangt der Anbieter einen Eigentumsnachweis
                    (TXT) — Details bei deinem Domain-Provider sichtbar.
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={busy}
                className="text-brand-muted hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Trennen
              </Button>
              {!status!.verified && (
                <Button variant="outline" onClick={handleVerify} disabled={busy}>
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Jetzt prüfen
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
