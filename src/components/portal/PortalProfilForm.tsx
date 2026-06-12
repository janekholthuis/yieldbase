"use client";

import { useState, useTransition } from "react";
import type { PortalDashboard } from "@/lib/data/portal";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { updateMyKundeProfile } from "@/lib/actions/portal";
import { SectionCard } from "@/components/ui/section-card";
import { StatRow } from "@/components/ui/stat-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  UserCircle,
  Wallet,
  Mail,
  Phone,
  KeyRound,
  LogOut,
  Trash2,
} from "lucide-react";

const fmtEur = (n?: number | null) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(n);

const fmtPct = (n?: number | null) =>
  n == null ? "—" : `${(n * (n < 1 ? 100 : 1)).toFixed(1).replace(".", ",")} %`;

interface FormState {
  anrede: "" | "herr" | "frau" | "divers";
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  telefon: string;
  adresse: string;
  plz: string;
  stadt: string;
  bundesland: string;
}

export function PortalProfilForm({ data }: { data: PortalDashboard }) {
  const { user, signOut } = useAuth();
  const [supabase] = useState(() => createClient());
  const [saving, startSaving] = useTransition();

  const k = data.kunde;
  const vp = data.vp;

  const [form, setForm] = useState<FormState>({
    anrede: (k?.anrede as FormState["anrede"]) ?? "",
    vorname: k?.vorname ?? "",
    nachname: k?.nachname ?? "",
    geburtsdatum: k?.geburtsdatum ?? "",
    telefon: k?.telefon ?? "",
    adresse: k?.adresse ?? "",
    plz: k?.plz ?? "",
    stadt: k?.stadt ?? "",
    bundesland: k?.bundesland ?? "",
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startSaving(async () => {
      try {
        await updateMyKundeProfile({
          anrede: form.anrede || null,
          vorname: form.vorname || null,
          nachname: form.nachname || null,
          geburtsdatum: form.geburtsdatum || null,
          telefon: form.telefon || null,
          adresse: form.adresse || null,
          plz: form.plz || null,
          stadt: form.stadt || null,
          bundesland: form.bundesland || null,
        });
        toast.success("Stammdaten gespeichert");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Speichern fehlgeschlagen",
        );
      }
    });
  };

  const onChangePassword = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("E-Mail zum Zurücksetzen wurde versendet");
  };

  const onLogoutAll = async () => {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) toast.error(error.message);
    else {
      toast.success("Auf allen Geräten abgemeldet");
      window.location.href = "/login";
    }
  };

  const onDeleteAccount = async () => {
    // Soft-Anonymisierung: leere personenbezogene Felder, Logout
    try {
      if (k) {
        await supabase
          .from("kunden")
          .update({
            vorname: null,
            nachname: null,
            email: null,
            telefon: null,
            adresse: null,
            plz: null,
            stadt: null,
            bundesland: null,
            geburtsdatum: null,
          })
          .eq("id", k.id);
      }
      await signOut();
      toast.success(
        "Dein Account wurde anonymisiert. Wende dich für die endgültige Löschung an deinen Berater.",
      );
      window.location.href = "/login";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Löschung fehlgeschlagen");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 md:px-6 md:py-10">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Mein Profil
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Halte deine Stammdaten aktuell, so können wir dich optimal begleiten.
        </p>
      </header>

      {/* Stammdaten */}
      <SectionCard
        icon={<UserCircle className="h-5 w-5" />}
        title="Stammdaten"
        subtitle="Diese Angaben siehst nur du und dein Berater"
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
          <div>
            <Label htmlFor="anrede">Anrede</Label>
            <Select
              value={form.anrede || undefined}
              onValueChange={(v) =>
                setForm((s) => ({ ...s, anrede: v as FormState["anrede"] }))
              }
            >
              <SelectTrigger id="anrede" className="mt-1.5">
                <SelectValue placeholder="Bitte wählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="herr">Herr</SelectItem>
                <SelectItem value="frau">Frau</SelectItem>
                <SelectItem value="divers">Divers</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="geburtsdatum">Geburtsdatum</Label>
            <Input
              id="geburtsdatum"
              type="date"
              className="mt-1.5"
              value={form.geburtsdatum}
              onChange={(e) =>
                setForm((s) => ({ ...s, geburtsdatum: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="vorname">Vorname</Label>
            <Input
              id="vorname"
              className="mt-1.5"
              value={form.vorname}
              onChange={(e) =>
                setForm((s) => ({ ...s, vorname: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="nachname">Nachname</Label>
            <Input
              id="nachname"
              className="mt-1.5"
              value={form.nachname}
              onChange={(e) =>
                setForm((s) => ({ ...s, nachname: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="telefon">Telefon</Label>
            <Input
              id="telefon"
              className="mt-1.5"
              value={form.telefon}
              onChange={(e) =>
                setForm((s) => ({ ...s, telefon: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              className="mt-1.5"
              value={user?.email ?? ""}
              readOnly
              disabled
            />
            <p className="mt-1 text-xs text-muted-foreground">
              E-Mail-Wechsel bitte über deinen Berater anstoßen.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input
              id="adresse"
              className="mt-1.5"
              value={form.adresse}
              onChange={(e) =>
                setForm((s) => ({ ...s, adresse: e.target.value }))
              }
            />
          </div>
          <div>
            <Label htmlFor="plz">PLZ</Label>
            <Input
              id="plz"
              className="mt-1.5"
              value={form.plz}
              onChange={(e) => setForm((s) => ({ ...s, plz: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="stadt">Stadt</Label>
            <Input
              id="stadt"
              className="mt-1.5"
              value={form.stadt}
              onChange={(e) => setForm((s) => ({ ...s, stadt: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="bundesland">Bundesland</Label>
            <Input
              id="bundesland"
              className="mt-1.5"
              value={form.bundesland}
              onChange={(e) =>
                setForm((s) => ({ ...s, bundesland: e.target.value }))
              }
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Speichert …" : "Speichern"}
            </Button>
          </div>
        </form>
      </SectionCard>

      {/* Bonität read-only */}
      <SectionCard
        icon={<Wallet className="h-5 w-5" />}
        title="Bonität (Übersicht)"
        subtitle="Wenn sich deine Situation geändert hat, sprich deinen Berater an"
      >
        <div className="space-y-3">
          <StatRow
            label="Maximal finanzierbar"
            value={fmtEur(k?.max_finanzierbar)}
          />
          <StatRow
            label="Maximale Monatsrate"
            value={fmtEur(k?.max_monatsrate)}
          />
          <StatRow
            label="Persönlicher Steuersatz"
            value={fmtPct(k?.persoenlicher_steuersatz)}
          />
          <StatRow label="Eigenkapital" value={fmtEur(k?.eigenkapital)} />
          <StatRow
            label="Brutto-Jahreseinkommen"
            value={fmtEur(k?.brutto_jahreseinkommen)}
          />
        </div>
      </SectionCard>

      {/* Mein Berater */}
      <SectionCard icon={<Mail className="h-5 w-5" />} title="Mein Berater">
        {vp ? (
          <div className="flex items-start gap-4">
            {vp.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vp.avatar_url}
                alt={vp.name ?? "Berater"}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--highlight-bg)] font-display text-lg font-bold text-[color:var(--primary)]">
                {(vp.vorname?.[0] ?? vp.name?.[0] ?? "B").toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-display text-base font-semibold">
                {vp.name ||
                  [vp.vorname, vp.nachname].filter(Boolean).join(" ") ||
                  "Dein Berater"}
              </div>
              <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                {vp.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5" />
                    <a href={`mailto:${vp.email}`}>{vp.email}</a>
                  </div>
                )}
                {vp.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    <a href={`tel:${vp.phone}`}>{vp.phone}</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Berater wird zugewiesen.
          </p>
        )}
      </SectionCard>

      {/* Account-Einstellungen */}
      <SectionCard
        icon={<KeyRound className="h-5 w-5" />}
        title="Account-Einstellungen"
      >
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={onChangePassword}
            className="w-full justify-start sm:w-auto"
          >
            <KeyRound className="mr-2 h-4 w-4" /> Passwort ändern
          </Button>
          <Button
            variant="outline"
            onClick={onLogoutAll}
            className="w-full justify-start sm:w-auto"
          >
            <LogOut className="mr-2 h-4 w-4" /> Auf allen Geräten ausloggen
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full justify-start sm:w-auto"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Account löschen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Account wirklich löschen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Deine personenbezogenen Daten werden anonymisiert. Aktive
                  Reservierungen und vertragliche Unterlagen werden aus
                  gesetzlichen Gründen aufbewahrt. Dein Berater wird informiert.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={onDeleteAccount}>
                  Endgültig löschen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SectionCard>
    </div>
  );
}
