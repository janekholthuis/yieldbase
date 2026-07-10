"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  RefreshCw,
  CheckCircle2,
  MoreHorizontal,
  FileSignature,
  ClipboardList,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  CONTACTS,
  PIPELINE,
  STAGE_BY_KEY,
  initials,
  EMAIL_SYNC,
  type StageKey,
  type CrmContact,
} from "@/lib/crm-mock";

export function CrmListView() {
  const [stage, setStage] = useState<StageKey | "alle">("alle");
  const [q, setQ] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  // Einklapp-Zustand über Reloads hinweg merken.
  useEffect(() => {
    setCollapsed(localStorage.getItem("crm-smartviews-collapsed") === "1");
  }, []);
  const toggleCollapsed = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("crm-smartviews-collapsed", next ? "1" : "0");
      return next;
    });

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of CONTACTS) m[c.stage] = (m[c.stage] ?? 0) + 1;
    return m;
  }, []);

  const filtered = useMemo(() => {
    let r = CONTACTS;
    if (stage !== "alle") r = r.filter((c) => c.stage === stage);
    if (q.trim()) {
      const n = q.toLowerCase();
      r = r.filter((c) =>
        [c.vorname, c.nachname, c.email, c.stadt, c.objekt?.name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(n)),
      );
    }
    return r;
  }, [stage, q]);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
      {/* Smart Views — Pipeline-Stufen */}
      <aside
        className={`shrink-0 border-b bg-card transition-[width] duration-ds-short ease-ds-out lg:border-b-0 lg:border-r ${
          collapsed ? "lg:w-16" : "lg:w-72"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 lg:px-3">
          {!collapsed && (
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Smart Views
            </span>
          )}
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Smart Views ausklappen" : "Smart Views einklappen"}
            className="ml-auto hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-state-hover hover:text-foreground lg:inline-flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:overflow-visible lg:pb-4">
          <StageButton
            active={stage === "alle"}
            onClick={() => setStage("alle")}
            icon={Users}
            label="Alle Kontakte"
            count={CONTACTS.length}
            collapsed={collapsed}
          />
          {PIPELINE.map((s) => (
            <StageButton
              key={s.key}
              active={stage === s.key}
              onClick={() => setStage(s.key)}
              icon={s.icon}
              label={s.label}
              count={counts[s.key] ?? 0}
              collapsed={collapsed}
            />
          ))}
        </nav>
      </aside>

      {/* Kontakt-Übersicht */}
      <div className="min-w-0 flex-1 p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {stage === "alle" ? "Alle Kontakte" : STAGE_BY_KEY[stage].label}
          </h1>
          <span className="rounded-full bg-muted px-2 py-0.5 text-sm text-muted-foreground">
            {filtered.length}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <EmailSyncBadge />
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> Neuer Kontakt
            </Button>
          </div>
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Kontakte, E-Mail, Objekt suchen …"
            className="pl-8"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
            Keine Kontakte in dieser Ansicht.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            <ul className="divide-y">
              {filtered.map((c) => (
                <ContactRow key={c.id} c={c} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function StageButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  collapsed,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  count: number;
  collapsed: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? `${label} (${count})` : undefined}
      className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition lg:w-full ${
        collapsed ? "lg:justify-center lg:px-0" : ""
      } ${
        active
          ? "bg-primary/10 font-medium text-foreground"
          : "text-muted-foreground hover:bg-state-hover hover:text-foreground"
      }`}
    >
      <span className="relative leading-none">
        <Icon className="h-4 w-4" />
        {collapsed && count > 0 && (
          <span className="absolute -right-2 -top-1.5 hidden h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground lg:flex">
            {count}
          </span>
        )}
      </span>
      <span className={`min-w-0 flex-1 truncate ${collapsed ? "lg:hidden" : ""}`}>{label}</span>
      <span
        className={`shrink-0 rounded-full px-1.5 text-xs ${collapsed ? "lg:hidden" : ""} ${
          active ? "bg-primary/15 text-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function ContactRow({ c }: { c: CrmContact }) {
  const stage = STAGE_BY_KEY[c.stage];
  return (
    <li className="group relative flex items-center gap-3 px-4 py-3 transition hover:bg-state-hover">
      <Link
        href={`/crm/${c.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
            {initials(c.vorname, c.nachname)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">
              {c.vorname} {c.nachname}
            </span>
            <StagePill stage={c.stage} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" /> {c.email}
            </span>
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" /> {c.telefon}
            </span>
          </div>
        </div>

        {/* Verlinktes Objekt */}
        <div className="hidden w-56 shrink-0 md:block">
          {c.objekt ? (
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <div className="truncate font-medium">{c.objekt.name}</div>
                <div className="text-xs text-muted-foreground">
                  {c.objekt.kaufpreis} · {c.objekt.wohnung}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Kein Objekt</span>
          )}
        </div>

        <div className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground lg:block">
          {c.lastActivity}
        </div>
      </Link>

      <RowMenu name={`${c.vorname} ${c.nachname}`} />
      <span className={`absolute left-0 top-0 h-full w-1 ${stage.dot}`} aria-hidden />
    </li>
  );
}

function StagePill({ stage }: { stage: StageKey }) {
  const s = STAGE_BY_KEY[stage];
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      <span className="max-w-[180px] truncate">{s.label}</span>
    </span>
  );
}

function RowMenu({ name }: { name: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-muted-foreground"
          aria-label="Aktionen"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => toast.success("Selbstauskunft-Link erstellt (Prototyp)")}>
          <ClipboardList className="mr-2 h-4 w-4" /> Selbstauskunft starten
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast.success("Reservierung gestartet (Prototyp)")}>
          <FileSignature className="mr-2 h-4 w-4" /> Reservierung starten
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EmailSyncBadge() {
  return (
    <span className="hidden items-center gap-1.5 rounded-full border bg-success-soft px-2.5 py-1 text-xs text-success sm:inline-flex">
      {EMAIL_SYNC.connected ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5" />
      )}
      E-Mail synchronisiert · {EMAIL_SYNC.lastSync}
    </span>
  );
}
