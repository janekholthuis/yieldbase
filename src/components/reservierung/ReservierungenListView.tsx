"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutGrid,
  Rows,
  Download,
  Ban,
  CalendarPlus,
  Mail,
  AlertCircle,
} from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { getReservationStatusVariant } from "@/lib/status-colors";
import { formatEUR } from "@/lib/objekt-format";
import {
  cancelReservierung,
  extendReservierung,
  getReservierungSignedUrl,
  sendReservierungEmail,
} from "@/lib/actions/reservierungen";
import type { ReservierungListItem } from "@/lib/data/reservierungen";

const STATUS_LABEL: Record<string, string> = {
  entwurf: "Entwurf",
  reserviert: "Reserviert",
  storniert: "Storniert",
  abgelaufen: "Abgelaufen",
  beurkundet: "Beurkundet",
};

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

function daysUntil(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

function fullKundeName(r: ReservierungListItem) {
  const k = r.kunde;
  if (!k) return "—";
  return `${k.vorname ?? ""} ${k.nachname ?? ""}`.trim() || "(ohne Name)";
}

function vpName(r: ReservierungListItem) {
  const v = r.vp;
  if (!v) return "—";
  return `${v.vorname ?? ""} ${v.nachname ?? ""}`.trim() || v.name || "—";
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function fristLabel(r: ReservierungListItem) {
  if (r.status !== "reserviert") return null;
  const d = daysUntil(r.expires_at);
  if (d < 0) return { text: `vor ${Math.abs(d)} Tagen abgelaufen`, urgent: true };
  if (d === 0) return { text: "läuft heute ab", urgent: true };
  if (d <= 7) return { text: `läuft in ${d} Tagen ab`, urgent: true };
  return { text: `läuft in ${d} Tagen ab`, urgent: false };
}

interface ReservierungenListViewProps {
  reservierungen: ReservierungListItem[];
}

export function ReservierungenListView({
  reservierungen,
}: ReservierungenListViewProps) {
  const router = useRouter();
  const { roles } = useAuth();
  const isAdmin = roles?.includes("admin") ?? false;
  const canFilterVp =
    isAdmin ||
    (roles?.includes("vertriebsleiter") ?? false) ||
    (roles?.includes("support") ?? false);

  const rows = reservierungen;

  const [view, setView] = useState<"grid" | "table">("grid");
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState<string>("alle");
  const [fristF, setFristF] = useState<string>("alle");
  const [vpF, setVpF] = useState<string>("alle");
  const [sort, setSort] = useState<"new" | "frist" | "status">("new");
  const [confirmCancel, setConfirmCancel] = useState<ReservierungListItem | null>(
    null,
  );
  const [confirmExtend, setConfirmExtend] = useState<ReservierungListItem | null>(
    null,
  );
  const [extendTage, setExtendTage] = useState(14);
  const [busy, setBusy] = useState(false);

  const vps = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => {
      if (r.vp_id) m.set(r.vp_id, vpName(r));
    });
    return Array.from(m, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name, "de"),
    );
  }, [rows]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { alle: rows.length };
    Object.keys(STATUS_LABEL).forEach((k) => (c[k] = 0));
    rows.forEach((r) => {
      c[r.status] = (c[r.status] ?? 0) + 1;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (statusF !== "alle") r = r.filter((x) => x.status === statusF);
    if (fristF === "7tage") {
      r = r.filter((x) => {
        if (x.status !== "reserviert") return false;
        const d = daysUntil(x.expires_at);
        return d >= 0 && d <= 7;
      });
    }
    if (fristF === "abgelaufen") {
      r = r.filter(
        (x) => x.status === "abgelaufen" || daysUntil(x.expires_at) < 0,
      );
    }
    if (vpF !== "alle") r = r.filter((x) => x.vp_id === vpF);
    if (q.trim()) {
      const needle = q.toLowerCase();
      r = r.filter((x) =>
        [
          fullKundeName(x),
          x.einheit?.wohnungsnummer,
          x.einheit?.projekt?.name,
          x.einheit?.projekt?.adresse,
          x.einheit?.projekt?.stadt,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle)),
      );
    }
    const arr = [...r];
    if (sort === "new")
      arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "frist")
      arr.sort((a, b) => +new Date(a.expires_at) - +new Date(b.expires_at));
    if (sort === "status") arr.sort((a, b) => a.status.localeCompare(b.status));
    return arr;
  }, [rows, q, statusF, fristF, vpF, sort]);

  const downloadPdf = async (r: ReservierungListItem) => {
    if (!r.pdf_url) {
      toast.error("Kein PDF verfügbar");
      return;
    }
    try {
      const { signedUrl } = await getReservierungSignedUrl({ id: r.id });
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download fehlgeschlagen");
    }
  };

  const resendEmail = async (r: ReservierungListItem) => {
    if (!r.kunde?.email) {
      toast.error("Kunde hat keine Email");
      return;
    }
    try {
      await sendReservierungEmail({ id: r.id });
      toast.success(`Email an ${r.kunde.email} versendet`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Email-Versand fehlgeschlagen");
    }
  };

  const doCancel = async () => {
    if (!confirmCancel) return;
    setBusy(true);
    try {
      await cancelReservierung({ id: confirmCancel.id });
      toast.success("Reservierung storniert");
      setConfirmCancel(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Stornierung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const doExtend = async () => {
    if (!confirmExtend) return;
    setBusy(true);
    try {
      await extendReservierung({ id: confirmExtend.id, tage: extendTage });
      toast.success(`Um ${extendTage} Tage verlängert`);
      setConfirmExtend(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verlängerung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold text-brand-ink">Reservierungen</h1>
        <Badge variant="secondary">{rows.length}</Badge>
      </div>

      {/* Status-Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-brand-border bg-brand-surfaceMuted/40 p-1">
        {(["alle", "reserviert", "beurkundet", "storniert", "abgelaufen"] as const).map(
          (k) => {
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
          },
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] max-w-md flex-1">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Suchen nach Kunde oder Einheit …"
            className="pl-8"
            aria-label="Reservierungen durchsuchen"
          />
        </div>
        <Select value={fristF} onValueChange={setFristF}>
          <SelectTrigger className="w-[180px]" aria-label="Frist-Filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Fristen</SelectItem>
            <SelectItem value="7tage">Läuft in 7 Tagen ab</SelectItem>
            <SelectItem value="abgelaufen">Abgelaufen</SelectItem>
          </SelectContent>
        </Select>
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
            <SelectItem value="frist">Frist aufsteigend</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-1 rounded-md border border-brand-border p-1">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("grid")}
            aria-label="Kartenansicht"
            aria-pressed={view === "grid"}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("table")}
            aria-label="Tabellenansicht"
            aria-pressed={view === "table"}
          >
            <Rows className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-brand-border p-10 text-center">
          <p className="mb-1 text-sm font-medium text-brand-ink">
            Keine Reservierungen
          </p>
          <p className="text-sm text-brand-muted">
            Erstelle eine Reservierung über ein Objekt oder einen Kunden.
          </p>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const frist = fristLabel(r);
            const kn = fullKundeName(r);
            return (
              <div
                key={r.id}
                className="rounded-lg border border-brand-border bg-card p-4 transition hover:border-brand-primary/40 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{initials(kn) || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-medium text-brand-ink">{kn}</h3>
                      <Badge variant={getReservationStatusVariant(r.status)}>
                        {statusLabel(r.status)}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-brand-muted">
                      {r.einheit?.projekt?.name ?? "—"} · Whg.{" "}
                      {r.einheit?.wohnungsnummer ?? "—"}
                    </p>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-brand-muted">Reserviert</span>
                    <span>{fmtDate(r.signed_at ?? r.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-brand-muted">Frist</span>
                    <span>{fmtDate(r.expires_at)}</span>
                  </div>
                  {frist && (
                    <div
                      className={`flex items-center gap-1 rounded px-2 py-1 ${
                        frist.urgent
                          ? "bg-brand-dangerSoft text-brand-danger"
                          : "bg-brand-surfaceMuted text-brand-muted"
                      }`}
                    >
                      {frist.urgent && <AlertCircle className="h-3 w-3" />}
                      <span>{frist.text}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-brand-muted">Gebühr</span>
                    <span className="font-medium text-brand-ink">
                      {formatEUR(r.reservierungsgebuehr)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-brand-border pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadPdf(r)}
                    disabled={!r.pdf_url}
                  >
                    <Download className="mr-1 h-3.5 w-3.5" /> PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resendEmail(r)}
                    disabled={!r.kunde?.email}
                  >
                    <Mail className="mr-1 h-3.5 w-3.5" /> Email
                  </Button>
                  {r.status === "reserviert" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmCancel(r)}
                    >
                      <Ban className="mr-1 h-3.5 w-3.5" /> Stornieren
                    </Button>
                  )}
                  {isAdmin && r.status === "reserviert" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setExtendTage(14);
                        setConfirmExtend(r);
                      }}
                    >
                      <CalendarPlus className="mr-1 h-3.5 w-3.5" /> Verlängern
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-brand-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kunde</TableHead>
                <TableHead>Einheit</TableHead>
                <TableHead>Reserviert</TableHead>
                <TableHead>Frist</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Gebühr</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const frist = fristLabel(r);
                const kn = fullKundeName(r);
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">
                            {initials(kn) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-brand-ink">{kn}</div>
                          <div className="text-xs text-brand-muted">
                            {r.kunde?.email ?? "—"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{r.einheit?.projekt?.name ?? "—"}</div>
                      <div className="text-xs text-brand-muted">
                        Whg. {r.einheit?.wohnungsnummer ?? "—"}
                        {r.einheit?.projekt?.stadt
                          ? ` · ${r.einheit.projekt.stadt}`
                          : ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {fmtDate(r.signed_at ?? r.created_at)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{fmtDate(r.expires_at)}</div>
                      {frist && (
                        <div
                          className={`text-xs ${
                            frist.urgent
                              ? "text-brand-danger"
                              : "text-brand-muted"
                          }`}
                        >
                          {frist.text}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getReservationStatusVariant(r.status)}>
                        {statusLabel(r.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatEUR(r.reservierungsgebuehr)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => downloadPdf(r)}
                          disabled={!r.pdf_url}
                          aria-label="PDF herunterladen"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => resendEmail(r)}
                          disabled={!r.kunde?.email}
                          aria-label="Email erneut senden"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        {r.status === "reserviert" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setConfirmCancel(r)}
                            aria-label="Stornieren"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                        {isAdmin && r.status === "reserviert" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setExtendTage(14);
                              setConfirmExtend(r);
                            }}
                            aria-label="Verlängern"
                          >
                            <CalendarPlus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog
        open={!!confirmCancel}
        onOpenChange={(o) => !o && setConfirmCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reservierung stornieren?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmCancel ? (
                <>
                  Reservierung für <strong>{fullKundeName(confirmCancel)}</strong> ·
                  Whg. {confirmCancel.einheit?.wohnungsnummer} wird storniert. Die
                  Einheit wird automatisch wieder als verfügbar gekennzeichnet.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={doCancel} disabled={busy}>
              Stornieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!confirmExtend}
        onOpenChange={(o) => !o && setConfirmExtend(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reservierung verlängern</AlertDialogTitle>
            <AlertDialogDescription>
              Um wie viele Tage soll die Reservierung verlängert werden?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              type="number"
              min={1}
              max={365}
              value={extendTage}
              onChange={(e) => setExtendTage(Number(e.target.value || 14))}
              aria-label="Anzahl Tage"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={doExtend} disabled={busy}>
              Verlängern
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
