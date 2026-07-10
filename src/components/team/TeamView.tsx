"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Mail,
  Trash2,
  Pencil,
  Check,
  X,
  Loader2,
  Copy,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { createInvite } from "@/lib/actions/auth";
import { updateVpCommissionRate, revokeInvite } from "@/lib/actions/team";
import type { TeamMember, PendingInvite } from "@/lib/data/team";

// Which VP sub-roles a caller may invite, by their own role. Mirrors the
// canonical who-may-invite-whom matrix in createInvite (auth.ts); the dialog
// only offers roles the backend will actually accept.
const INVITE_MAP: Record<string, string[]> = {
  admin: ["vp_l1", "vp_l2", "vp_l3"],
  vertriebsleiter: ["vp_l1"],
  vp_l1: ["vp_l2"],
  vp_l2: ["vp_l3"],
  vp_l3: [],
};

// Per-level indentation as static Tailwind classes (no inline styles).
const LEVEL_INDENT = ["", "pl-4", "pl-8", "pl-12", "pl-16"] as const;

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  support: "Support",
  vertriebsleiter: "Vertriebsleiter",
  vp_l1: "VP L1",
  vp_l2: "VP L2",
  vp_l3: "VP L3",
  finanzierer: "Finanzierer",
  kunde: "Kunde",
};

function roleLabel(r: string | null) {
  if (!r) return "—";
  return ROLE_LABEL[r] ?? r;
}

function initials(name: string | null) {
  if (!name) return "?";
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function fmtPercent(n: number) {
  return `${n.toLocaleString("de-DE", { maximumFractionDigits: 2 })} %`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface TeamViewProps {
  members: TeamMember[];
  invites: PendingInvite[];
}

export function TeamView({ members, invites }: TeamViewProps) {
  const router = useRouter();
  const { roles, user } = useAuth();
  const canManageRates =
    (roles?.includes("admin") ?? false) ||
    (roles?.includes("vertriebsleiter") ?? false);

  // Roles this caller may invite (union over their roles), deduped + ordered.
  const invitableRoles = (["vp_l1", "vp_l2", "vp_l3"] as const).filter((r) =>
    (roles ?? []).some((own) => INVITE_MAP[own]?.includes(r)),
  );
  const canInvite = invitableRoles.length > 0;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>(
    invitableRoles[0] ?? "vp_l1",
  );
  const [rate, setRate] = useState(5);
  const [busy, setBusy] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    acceptUrl: string;
    emailSent: boolean;
  } | null>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState(0);

  const [revokeTarget, setRevokeTarget] = useState<PendingInvite | null>(null);

  const submitInvite = async () => {
    if (!email.trim()) {
      toast.error("Bitte eine Email angeben");
      return;
    }
    setBusy(true);
    try {
      const res = await createInvite({
        email: email.trim(),
        role: inviteRole as "vp_l1" | "vp_l2" | "vp_l3",
        commission_rate: rate,
      });
      setInviteResult({
        email: email.trim(),
        acceptUrl: res.acceptUrl,
        emailSent: res.emailSent,
      });
      toast.success(
        res.emailSent
          ? `Einladung per E-Mail an ${email.trim()} gesendet`
          : `Einladung erstellt — Link teilen (E-Mail-Versand nicht möglich)`,
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Einladung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  const closeInvite = () => {
    setInviteOpen(false);
    setInviteResult(null);
    setEmail("");
    setRate(5);
  };

  const copyInviteLink = async () => {
    if (!inviteResult) return;
    try {
      await navigator.clipboard.writeText(inviteResult.acceptUrl);
      toast.success("Link kopiert");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  const saveRate = async (m: TeamMember) => {
    setBusy(true);
    try {
      await updateVpCommissionRate({ vpId: m.vpId, commissionRate: editRate });
      toast.success(`Provisionssatz für ${m.name ?? "VP"} aktualisiert`);
      setEditId(null);
      router.refresh();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Aktualisierung fehlgeschlagen",
      );
    } finally {
      setBusy(false);
    }
  };

  const doRevoke = async () => {
    if (!revokeTarget) return;
    setBusy(true);
    try {
      await revokeInvite({ inviteId: revokeTarget.id });
      toast.success("Einladung zurückgezogen");
      setRevokeTarget(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Zurückziehen fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Mein Team"
        description={`${members.length} ${members.length === 1 ? "Mitglied" : "Mitglieder"}`}
      >
        {canInvite && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-1 h-4 w-4" /> Sub-VP einladen
          </Button>
        )}
      </PageHeader>

      {members.length === 0 ? (
        <div className="rounded-lg border border-dashed border-brand-border p-10 text-center">
          <p className="mb-1 text-sm font-medium text-brand-ink">
            Noch kein Team
          </p>
          <p className="text-sm text-brand-muted">
            {canInvite
              ? "Lade deinen ersten Sub-VP ein, um deine Hierarchie aufzubauen."
              : "Dir sind noch keine Teammitglieder zugeordnet."}
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-brand-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-center">Ebene</TableHead>
                <TableHead className="text-right">Provisionssatz</TableHead>
                {canManageRates && (
                  <TableHead className="text-right">Aktion</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const isSelf = m.vpId === user?.id;
                const editing = editId === m.vpId;
                return (
                  <TableRow key={m.vpId}>
                    <TableCell>
                      <div
                        className={`flex items-center gap-2 ${
                          LEVEL_INDENT[
                            Math.min(
                              Math.max(0, m.level - 1),
                              LEVEL_INDENT.length - 1,
                            )
                          ]
                        }`}
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">
                            {initials(m.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-brand-ink">
                            {m.name ?? "(ohne Name)"}
                            {isSelf && (
                              <span className="ml-1 text-xs text-brand-muted">
                                (Du)
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-brand-muted">
                            {m.email ?? "—"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {m.level}
                    </TableCell>
                    <TableCell className="text-right">
                      {editing ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            value={editRate}
                            onChange={(e) =>
                              setEditRate(Number(e.target.value || 0))
                            }
                            className="h-8 w-20 text-right"
                            aria-label="Provisionssatz"
                          />
                          <span className="text-sm text-brand-muted">%</span>
                        </div>
                      ) : (
                        <span className="font-medium text-brand-ink">
                          {fmtPercent(m.commissionRate)}
                        </span>
                      )}
                    </TableCell>
                    {canManageRates && (
                      <TableCell className="text-right">
                        {editing ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => saveRate(m)}
                              disabled={busy}
                              aria-label="Speichern"
                            >
                              {busy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditId(null)}
                              disabled={busy}
                              aria-label="Abbrechen"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditId(m.vpId);
                              setEditRate(m.commissionRate);
                            }}
                            disabled={isSelf}
                            aria-label="Provisionssatz bearbeiten"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Offene Einladungen */}
      {invites.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-brand-ink">
            Offene Einladungen
          </h2>
          <div className="rounded-md border border-brand-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Satz</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead>Gültig bis</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invites.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-brand-muted" />
                        {i.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {i.commissionRate != null
                        ? fmtPercent(i.commissionRate)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {fmtDate(i.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {fmtDate(i.expiresAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setRevokeTarget(i)}
                        aria-label="Einladung zurückziehen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Einladungs-Dialog */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(o) => {
          if (busy) return;
          if (!o) closeInvite();
          else setInviteOpen(true);
        }}
      >
        <DialogContent>
          {inviteResult ? (
            <>
              <DialogHeader>
                <DialogTitle>Einladung erstellt</DialogTitle>
                <DialogDescription>
                  {inviteResult.emailSent ? (
                    <span className="flex items-center gap-1.5 text-brand-success">
                      <CheckCircle2 className="h-4 w-4" />
                      E-Mail an {inviteResult.email} gesendet.
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-brand-danger">
                      <AlertCircle className="h-4 w-4" />
                      E-Mail konnte nicht versendet werden — teile den Link manuell.
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5 py-2">
                <Label>Einladungslink</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={inviteResult.acceptUrl} className="font-mono text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyInviteLink}
                    aria-label="Link kopieren"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-brand-muted">
                  Gültig für 7 Tage. Über diesen Link erstellt die Person ihr Konto.
                </p>
              </div>
              <DialogFooter>
                <Button onClick={closeInvite}>Fertig</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Sub-VP einladen</DialogTitle>
                <DialogDescription>
                  Die Person wird unter dir in der Hierarchie eingeordnet und
                  erhält eine Einladungs-Email mit Anmelde-Link.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@beispiel.de"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-role">Rolle</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger id="invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {invitableRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {roleLabel(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="invite-rate">Provisionssatz (%)</Label>
                  <Input
                    id="invite-rate"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={rate}
                    onChange={(e) => setRate(Number(e.target.value || 0))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeInvite} disabled={busy}>
                  Abbrechen
                </Button>
                <Button onClick={submitInvite} disabled={busy}>
                  {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Einladen
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(o) => !o && setRevokeTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Einladung zurückziehen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Einladung an <strong>{revokeTarget?.email}</strong> wird gelöscht
              und der Link wird ungültig.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={doRevoke} disabled={busy}>
              Zurückziehen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
