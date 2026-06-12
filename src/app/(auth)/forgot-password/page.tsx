"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Konnte Reset-Email nicht senden", { description: error.message });
      return;
    }
    setSent(true);
  };

  return (
    <AuthShell
      title="Passwort zurücksetzen"
      subtitle="Wir schicken dir einen Link zum Setzen eines neuen Passworts."
      footer={
        <Link href="/login" className="text-foreground hover:underline">
          Zurück zum Login
        </Link>
      }
    >
      {sent ? (
        <div className="rounded-md border border-border bg-muted/40 p-4 text-sm">
          Wenn ein Konto zu <strong>{email}</strong> existiert, ist gerade eine Email
          mit Reset-Link unterwegs. Der Link ist 24 Stunden gültig.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sende …" : "Reset-Link senden"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
