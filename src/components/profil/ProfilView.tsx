"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { passwordChecks } from "@/lib/password";
import { updateMyProfile, changeMyPassword } from "@/lib/actions/profil";
import type { MyProfile } from "@/lib/data/profil";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  support: "Support",
  vertriebsleiter: "Vertriebsleiter",
  vp_l1: "Vertriebspartner L1",
  vp_l2: "Vertriebspartner L2",
  vp_l3: "Vertriebspartner L3",
  kunde: "Kunde",
  finanzierer: "Finanzierungspartner",
};

const ANREDE = [
  { value: "herr", label: "Herr" },
  { value: "frau", label: "Frau" },
  { value: "divers", label: "Divers" },
] as const;

const NONE = "__none__";

export function ProfilView({ profile }: { profile: MyProfile }) {
  const router = useRouter();
  const { signOut } = useAuth();

  const [form, setForm] = useState({
    anrede: profile.anrede ?? NONE,
    vorname: profile.vorname ?? "",
    nachname: profile.nachname ?? "",
    phone: profile.phone ?? "",
    geburtsdatum: profile.geburtsdatum ?? "",
    address: profile.address ?? "",
    plz: profile.plz ?? "",
    stadt: profile.stadt ?? "",
    bundesland: profile.bundesland ?? "",
    persoenlicherSteuersatz:
      profile.persoenlicherSteuersatz == null
        ? ""
        : String(profile.persoenlicherSteuersatz),
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const set = (k: keyof typeof form, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const steuer = form.persoenlicherSteuersatz.trim();
      await updateMyProfile({
        anrede: form.anrede === NONE ? null : (form.anrede as "herr" | "frau" | "divers"),
        vorname: form.vorname,
        nachname: form.nachname,
        phone: form.phone,
        geburtsdatum: form.geburtsdatum,
        address: form.address,
        plz: form.plz,
        stadt: form.stadt,
        bundesland: form.bundesland,
        persoenlicherSteuersatz: steuer === "" ? null : Number(steuer),
      });
      toast.success("Profil gespeichert");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
    } finally {
      setSavingProfile(false);
    }
  };

  const pwChecks = passwordChecks(pw);
  const pwValid = pwChecks.every((c) => c.ok) && pw === pw2;

  const savePassword = async () => {
    if (!pwValid) return;
    setSavingPw(true);
    try {
      await changeMyPassword({ password: pw });
      toast.success("Passwort geändert");
      setPw("");
      setPw2("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Änderung fehlgeschlagen");
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <PageHeader title="Profil" description={profile.email ?? "—"}>
        {profile.roles.map((r) => (
          <Badge key={r} variant="secondary">
            {ROLE_LABEL[r] ?? r}
          </Badge>
        ))}
        <Button variant="outline" size="sm" onClick={() => signOut()}>
          <LogOut className="mr-1 h-4 w-4" /> Abmelden
        </Button>
      </PageHeader>

      {/* Persönliche Daten */}
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold text-brand-ink">Persönliche Daten</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="anrede">Anrede</Label>
            <Select value={form.anrede} onValueChange={(v) => set("anrede", v)}>
              <SelectTrigger id="anrede">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>—</SelectItem>
                {ANREDE.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="vorname">Vorname</Label>
            <Input
              id="vorname"
              value={form.vorname}
              onChange={(e) => set("vorname", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nachname">Nachname</Label>
            <Input
              id="nachname"
              value={form.nachname}
              onChange={(e) => set("nachname", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="geburtsdatum">Geburtsdatum</Label>
            <Input
              id="geburtsdatum"
              type="date"
              value={form.geburtsdatum}
              onChange={(e) => set("geburtsdatum", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email ?? ""} disabled readOnly />
          </div>
        </div>
      </Card>

      {/* Adresse */}
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold text-brand-ink">Adresse</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">Straße &amp; Hausnummer</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plz">PLZ</Label>
            <Input
              id="plz"
              value={form.plz}
              onChange={(e) => set("plz", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stadt">Stadt</Label>
            <Input
              id="stadt"
              value={form.stadt}
              onChange={(e) => set("stadt", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bundesland">Bundesland</Label>
            <Input
              id="bundesland"
              value={form.bundesland}
              onChange={(e) => set("bundesland", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="steuer">Persönlicher Steuersatz (%)</Label>
            <Input
              id="steuer"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.persoenlicherSteuersatz}
              onChange={(e) => set("persoenlicherSteuersatz", e.target.value)}
            />
            <p className="text-xs text-brand-muted">
              Wird als Vorgabe in der Objekt-Kalkulation genutzt.
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={saveProfile} disabled={savingProfile}>
            {savingProfile && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Speichern
          </Button>
        </div>
      </Card>

      {/* Passwort */}
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold text-brand-ink">Passwort ändern</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pw">Neues Passwort</Label>
            <Input
              id="pw"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw2">Wiederholen</Label>
            <Input
              id="pw2"
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        {pw.length > 0 && (
          <ul className="space-y-1 text-xs">
            {passwordChecks(pw).map((c) => (
              <li
                key={c.label}
                className={`flex items-center gap-1.5 ${
                  c.ok ? "text-brand-success" : "text-brand-muted"
                }`}
              >
                <Check className={`h-3.5 w-3.5 ${c.ok ? "" : "opacity-30"}`} />
                {c.label}
              </li>
            ))}
            {pw2.length > 0 && pw !== pw2 && (
              <li className="text-brand-danger">Passwörter stimmen nicht überein</li>
            )}
          </ul>
        )}
        <div className="flex justify-end">
          <Button onClick={savePassword} disabled={!pwValid || savingPw}>
            {savingPw && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Passwort ändern
          </Button>
        </div>
      </Card>
    </div>
  );
}
