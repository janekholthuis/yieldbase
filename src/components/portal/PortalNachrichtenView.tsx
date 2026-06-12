"use client";

// Customer notifications feed — surfaces the signed-in user's notifications
// (reuses the same server actions as the internal NotificationBell). A real
// two-way chat with the advisor is a separate, later feature; until then we show
// updates read-only plus how to reach the advisor.
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import {
  listMyNotifications,
  markNotificationsRead,
} from "@/lib/actions/notifications";
import type { NotificationItem } from "@/components/shell/NotificationBell";

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.floor(h / 24);
  return `vor ${d} ${d === 1 ? "Tag" : "Tagen"}`;
}

export function PortalNachrichtenView() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const unread = items.filter((i) => !i.read_at);

  useEffect(() => {
    let cancelled = false;
    listMyNotifications()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markAll = () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
    void markNotificationsRead().catch(() => {});
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:px-6 md:py-10">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Nachrichten
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Updates zu deiner Wohnung, Reservierung und Finanzierung.
          </p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={markAll}>
            <Check className="mr-1.5 h-4 w-4" /> Alle gelesen
          </Button>
        )}
      </header>

      <SectionCard noPadding>
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            Wird geladen …
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--highlight-bg)] text-[color:var(--primary)]">
              <Bell className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-brand-primary">
              Noch keine Nachrichten
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Sobald es Neuigkeiten zu deinem Vorgang gibt, erscheinen sie hier.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-brand-divider">
            {items.map((n) => {
              const body = (
                <div
                  className={`flex flex-col gap-0.5 px-5 py-4 ${
                    n.read_at ? "opacity-70" : "bg-brand-primaryTint/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold leading-snug text-brand-primary">
                      {n.titel}
                    </span>
                    {!n.read_at && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-accent" />
                    )}
                  </div>
                  {n.body && (
                    <span className="text-sm leading-snug text-brand-body">
                      {n.body}
                    </span>
                  )}
                  <span className="text-xs text-brand-subtle">
                    {relTime(n.created_at)}
                  </span>
                </div>
              );
              return (
                <li key={n.id}>
                  {n.link ? (
                    <Link href={n.link} className="block hover:bg-brand-surfaceMuted">
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <p className="px-1 text-xs text-muted-foreground">
        Du möchtest deinen Berater direkt erreichen? Die Kontaktdaten findest du
        auf der{" "}
        <Link href="/portal" className="font-medium text-[color:var(--primary)] hover:underline">
          Übersichtsseite
        </Link>
        .
      </p>
    </div>
  );
}
