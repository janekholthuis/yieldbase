"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { acceptInvite } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordChecks, passwordSchema } from "@/lib/password";

export function InviteAcceptForm({
  token,
  email,
  role,
}: {
  token: string;
  email: string;
  role: string;
}) {
  const [supabase] = useState(() => createClient());
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [submitting, setSubmitting] = useState(false);

  void role;
  const checks = passwordChecks(pw);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordSchema.safeParse(pw).success) {
      toast.error("Passwort erfüllt die Anforderungen nicht");
      return;
    }
    if (pw !== pw2) {
      toast.error("Passwörter stimmen nicht überein");
      return;
    }
    setSubmitting(true);
    try {
      await acceptInvite({ token, password: pw, name: name || undefined });
      // Direkt einloggen
      const { data, error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password: pw,
      });
      if (signErr) throw signErr;
      toast.success("Willkommen bei Yieldbase!");
      // Hard navigation so the server immediately sees the fresh auth cookie.
      if (data.session) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/login";
      }
    } catch (e) {
      toast.error("Aktivierung fehlgeschlagen", {
        description: (e as Error).message,
      });
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={email} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Dein Name</Label>
        <Input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Vor- und Nachname"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pw">Passwort</Label>
        <Input
          id="pw"
          type="password"
          autoComplete="new-password"
          required
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
      </div>
      <ul className="space-y-1 text-xs">
        {checks.map((c) => (
          <li
            key={c.label}
            className={c.ok ? "text-success" : "text-muted-foreground"}
          >
            {c.ok ? "✓" : "○"} {c.label}
          </li>
        ))}
      </ul>
      <div className="space-y-2">
        <Label htmlFor="pw2">Passwort wiederholen</Label>
        <Input
          id="pw2"
          type="password"
          autoComplete="new-password"
          required
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Aktiviere …" : "Account aktivieren"}
      </Button>
    </form>
  );
}
