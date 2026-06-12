"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { AuthShell } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function LoginInner() {
  const { session, roles, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") ?? undefined;

  useEffect(() => {
    if (!loading && session) {
      const isKundeOnly = roles.length > 0 && roles.every((r) => r === "kunde");
      router.replace(redirect ?? (isKundeOnly ? "/portal" : "/dashboard"));
    }
  }, [loading, session, roles, redirect, router]);

  return (
    <AuthShell
      title="Willkommen zurück"
      subtitle="Melde dich an, um auf dein Objektpilot-Konto zuzugreifen."
      footer={
        <Link href="/forgot-password" className="text-foreground hover:underline">
          Passwort vergessen?
        </Link>
      }
    >
      <Tabs defaultValue="password" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2">
          <TabsTrigger value="password">Email + Passwort</TabsTrigger>
          <TabsTrigger value="magic">Magic Link</TabsTrigger>
        </TabsList>
        <TabsContent value="password">
          <PasswordForm redirect={redirect} />
        </TabsContent>
        <TabsContent value="magic">
          <MagicLinkForm redirect={redirect} />
        </TabsContent>
      </Tabs>
    </AuthShell>
  );
}

function PasswordForm({ redirect }: { redirect?: string }) {
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keep, setKeep] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    void keep;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setSubmitting(false);
      toast.error("Login fehlgeschlagen", { description: error.message });
      return;
    }
    toast.success("Eingeloggt");
    // Hard navigation so the server immediately sees the fresh auth cookie.
    if (data.session) {
      window.location.href = redirect ?? "/dashboard";
    } else {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Passwort</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox checked={keep} onCheckedChange={(c) => setKeep(c === true)} />
        Eingeloggt bleiben
      </label>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Anmelden …" : "Anmelden"}
      </Button>
    </form>
  );
}

function MagicLinkForm({ redirect }: { redirect?: string }) {
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${redirect ?? "/dashboard"}`,
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error("Magic Link fehlgeschlagen", { description: error.message });
      return;
    }
    setSent(true);
    toast.success("Magic Link versendet, Postfach prüfen");
  };

  if (sent) {
    return (
      <div className="rounded-md border border-border bg-muted/40 p-4 text-sm">
        Wir haben dir einen Login-Link an <strong>{email}</strong> geschickt. Öffne ihn
        auf diesem Gerät, um dich anzumelden.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="magic-email">Email</Label>
        <Input
          id="magic-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Sende Link …" : "Magic Link senden"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Praktisch für Kunden, kein Passwort nötig.
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
