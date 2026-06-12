"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getProvisionStatusVariant } from "@/lib/status-colors";
import { formatEUR } from "@/lib/objekt-format";
import {
  generateProvisionen,
  updateProvisionStatus,
} from "@/lib/actions/provisionen";
import type {
  ProvisionListItem,
  ProvisionenSummary,
} from "@/lib/data/provisionen";

const STATUS_LABEL: Record<string, string> = {
  pipeline: "Pipeline",
  verdient: "Verdient",
  in_auszahlung: "In Auszahlung",
  ausgezahlt: "Ausgezahlt",
  storniert: "Storniert",
};

const STATUS_ORDER = [
  "pipeline",
  "verdient",
  "in_auszahlung",
  "ausgezahlt",
  "storniert",
] as const;

function statusLabel(s: string) {
  return STATUS_LABEL[s] ?? s;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtPercent(n: number) {
  return `${n.toLocaleString("de-DE", { maximumFractionDigits: 2 })} %`;
}

interface ProvisionenListViewProps {
  provisionen: ProvisionListItem[];
  summary: ProvisionenSummary;
}

export function ProvisionenListView({
  provisionen,
  summary,
}: ProvisionenListViewProps) {
  const router = useRouter();
  const { roles } = useAuth();
  const canManage =
    (roles?.includes("admin") ?? false) ||
    (roles?.includes("vertriebsleiter") ?? false);
  const canFilterVp =
    canManage || (roles?.includes("support") ?? false);

  const rows = provisionen;

  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<string>("alle");
  const [vpF, setVpF] = useState<string>("alle");
  const [sort, setSort] = useState<"new" | "betrag" | "status">("new");
  const [generating, setGenerating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const vps = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => {
      if (r.vpId) m.set(r.vpId, r.vpName ?? "Unbekannt");
    });
    return Array.from(m, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, "de"),
    );
  }, [rows]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { alle: rows.length };
    STATUS_ORDER.forEach((k) => (c[k] = 0));
    rows.forEach((r) => {
      c[r.status] = (c[r.status] ?? 0) + 1;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (statusF !== "alle") r = r.filter((x) => x.status === statusF);
    if (vpF !== "alle") r = r.filter((x) => x.vpId === vpF);
    if (q.trim()) {
      const needle = q.toLowerCase();
      r = r.filter((x) =>
        [x.vpName, x.einheitLabel]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle)),
      );
    }
    const arr = [...r];
    if (sort === "new")
      arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    if (sort === "betrag") arr.sort((a, b) => b.betrag - a.betrag);
    if (sort === "status") arr.sort((a, b) => a.status.localeCompare(b.status));
    return arr;
  }, [rows, q, statusF, vpF, sort]);

  const doGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateProvisionen();
      toast.success(
        `${res.provisionen} Provisionen aus ${res.reservierungen} Reservierungen erzeugt`,
      );
      router.refresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erzeugung fehlgeschlagen",
      );
    } finally {
      setGenerating(false);
    }
  };

  const changeStatus = async (r: ProvisionListItem, status: string) => {
    setSavingId(r.id);
    try {
      await updateProvisionStatus({
        id: r.id,
        status: status as ProvisionListItem["status"],
      });
      toast.success(`Status auf „${statusLabel(status)}“ gesetzt`);
      router.refresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Aktualisierung fehlgeschlagen",
      );
    } finally {
      setSavingId(null);
    }
  };

  const summaryCards: { key: string; label: string; value: number }[] = [
    { key: "pipeline", label: "Pipeline", value: summary.pipeline },
    { key: "verdient", label: "Verdient", value: summary.verdient },
    { key: "in_auszahlung", label: "In Auszahlung", value: summary.in_auszahlung },
    { key: "ausgezahlt", label: "Ausgezahlt", value: summary.ausgezahlt },
  ];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold text-brand-ink">Provisionen</h1>
        <Badge variant="secondary">{rows.length}</Badge>
        {canManage && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={doGenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-4 w-4" />
            )}
            Provisionen berechnen
          </Button>
        )}
      </div>

      {/* Summen-Karten */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((c) => (
          <div
            key={c.key}
            className="rounded-lg border border-brand-border bg-card p-4"
          >
            <div className="text-xs text-brand-muted">{c.label}</div>
            <div className="mt-1 text-xl font-semibold text-brand-ink">
              {formatEUR(c.value)}
            </div>
          </div>
        ))}
      </div>

      {/* Status-Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-brand-border bg-brand-surfaceMuted/40 p-1">
        {(["alle", ...STATUS_ORDER] as const).map((k) => {
          const active = statusF === k;
          const label = k === "alle" ? "Alle" : STATUS_LABEL[k];
          const count = statusCounts[k] ?? 0;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setStatusF(k)}
              aria-pressed={active}
              className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-background text-brand-ink shadow-sm"
                  : "text-brand-muted hover:text-brand-ink"
              }`}
            >
              <span>{label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  active
                    ? "bg-brand-primaryTint text-brand-primary"
                    : "bg-brand-surfaceMuted text-brand-muted"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-md flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suchen nach VP oder Einheit …"
            className="pl-8"
            aria-label="Provisionen durchsuchen"
          />
        </div>
        {canFilterVp && vps.length > 1 && (
          <Select value={vpF} onValueChange={setVpF}>
            <SelectTrigger className="w-[180px]" aria-label="VP-Filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle VPs</SelectItem>
              {vps.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger className="w-[180px]" aria-label="Sortierung">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Neueste zuerst</SelectItem>
            <SelectItem value="betrag">Betrag absteigend</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-brand-border p-10 text-center">
          <p className="mb-1 text-sm font-medium text-brand-ink">
            Keine Provisionen
          </p>
          <p className="text-sm text-brand-muted">
            {canManage
              ? "Berechne Provisionen aus den vorhandenen Reservierungen."
              : "Sobald Reservierungen abgeschlossen sind, erscheinen hier deine Provisionen."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-brand-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>VP</TableHead>
                <TableHead>Einheit</TableHead>
                <TableHead className="text-right">Kaufpreis</TableHead>
                <TableHead className="text-right">Satz</TableHead>
                <TableHead className="text-right">Betrag</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-brand-ink">
                    {r.vpName ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.einheitLabel ? `Whg. ${r.einheitLabel}` : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {r.kaufpreis != null ? formatEUR(r.kaufpreis) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {fmtPercent(r.provisionssatz)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-brand-ink">
                    {formatEUR(r.betrag)}
                  </TableCell>
                  <TableCell className="text-sm">{fmtDate(r.createdAt)}</TableCell>
                  <TableCell>
                    {canManage ? (
                      <Select
                        value={r.status}
                        onValueChange={(v) => changeStatus(r, v)}
                        disabled={savingId === r.id}
                      >
                        <SelectTrigger
                          className="h-8 w-[150px]"
                          aria-label="Status ändern"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_ORDER.map((s) => (
                            <SelectItem key={s} value={s}>
                              {STATUS_LABEL[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={getProvisionStatusVariant(r.status)}>
                        {statusLabel(r.status)}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
