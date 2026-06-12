"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { passwordChecks, passwordSchema } from "@/lib/password";

function ResetInner() {
  const [supabase] = useState(() => createClient());
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // The /auth/callback route already exchanged the reset code for a session
    // cookie before redirecting here, so a session should exist.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true);
        setChecked(true);
      } else {
        // Fallback: small delay then re-check (cookie propagation is async).
        setTimeout(async () => {
          const { data: d2 } = await supabase.auth.getSession();
          setReady(!!d2.session);
          setChecked(true);
        }, 600);
      }
    });
  }, [supabase]);

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
    const { error } = await supabase.auth.updateUser({ password: pw });
    setSubmitting(false);
    if (error) {
      toast.error("Konnte Passwort nicht setzen", { description: error.message });
      return;
    }
    toast.success("Passwort aktualisiert");
    window.location.href = "/login";
  };

  return (
    <AuthShell
      title="Neues Passwort"
      subtitle={
        ready ? "Lege ein neues Passwort fest." : "Wir prüfen deinen Reset-Link …"
      }
      footer={
        <Link href="/login" className="text-foreground hover:underline">
          Zurück zum Login
        </Link>
      }
    >
      {!ready ? (
        <p className="text-sm text-muted-foreground">
          {checked
            ? "Der Link ist evtl. abgelaufen oder ungültig. "
            : "Einen Moment … "}
          <Link href="/forgot-password" className="underline">
            Fordere einen neuen an
          </Link>
          .
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw">Neues Passwort</Label>
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
            {submitting ? "Speichere …" : "Passwort setzen"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}
