"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { SectionCard } from "@/components/ui/section-card";
import {
  Building2,
  Users,
  CalendarCheck,
  Coins,
  Wallet,
  Network,
} from "lucide-react";

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

const TILES: Array<{
  title: string;
  description: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  comingSoon?: boolean; // V1: deferred — greyed out (code kept)
}> = [
  { title: "Objekte", description: "Projekte und Einheiten", to: "/objekte", icon: Building2 },
  { title: "Kunden", description: "Pipeline und Stammdaten", to: "/kunden", icon: Users },
  { title: "Reservierungen", description: "Aktive Vorgänge", to: "/reservierungen", icon: CalendarCheck },
  { title: "Finanzierungen", description: "Cases mit Partnern", to: "/finanzierungen", icon: Coins, comingSoon: true },
  { title: "Provisionen", description: "Status und Auszahlungen", to: "/provisionen", icon: Wallet, comingSoon: true },
  { title: "Mein Team", description: "Hierarchie und Sub-VPs", to: "/team", icon: Network },
];

export default function DashboardPage() {
  const { user, roles } = useAuth();
  const name =
    (user?.user_metadata?.name as string | undefined) ?? user?.email ?? "";
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <span className="inline-flex items-center gap-2 rounded-full border border-brand-accent/30 bg-brand-accentSoft px-3 py-1 text-[11px] font-medium tracking-wide text-brand-accentText">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-accent" />
        Vertriebsplattform
      </span>
      <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight text-brand-primary md:text-5xl">
        Hallo <span className="text-brand-accent">{name}</span>
      </h1>
      <p className="mt-3 max-w-xl text-base text-brand-body">
        Du bist angemeldet als{" "}
        <strong className="text-brand-primary">
          {roles.map((r) => ROLE_LABEL[r] ?? r).join(", ") || "—"}
        </strong>
        . Wähle einen Bereich, um loszulegen.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) =>
          t.comingSoon ? (
            // V1: deferred area — greyed out and non-clickable (code kept).
            <div
              key={t.to}
              className="relative cursor-not-allowed opacity-60"
              aria-disabled
            >
              <span className="absolute right-3 top-3 z-10 rounded-full bg-brand-surfaceMuted px-2 py-0.5 text-[10px] font-medium text-brand-subtle">
                Bald
              </span>
              <SectionCard
                icon={<t.icon className="h-5 w-5" />}
                title={t.title}
                subtitle={t.description}
                className="h-full"
              />
            </div>
          ) : (
            <Link
              key={t.to}
              href={t.to}
              className="group block transition hover:-translate-y-0.5 focus:outline-none"
            >
              <SectionCard
                icon={<t.icon className="h-5 w-5" />}
                title={t.title}
                subtitle={t.description}
                className="h-full transition group-hover:shadow-[var(--shadow-card-hover)] group-focus-visible:ring-2 group-focus-visible:ring-ring"
              />
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
