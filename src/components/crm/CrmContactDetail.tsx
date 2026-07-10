"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  StickyNote,
  Mail,
  MessageSquare,
  Phone,
  ChevronDown,
  MoreHorizontal,
  Search,
  Building2,
  ExternalLink,
  MapPin,
  Globe,
  Plus,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  FileSignature,
  ClipboardList,
  Send,
  Trophy,
  Import,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  PIPELINE,
  STAGE_BY_KEY,
  initials,
  EMAIL_SYNC,
  type CrmContact,
  type StageKey,
  type Activity,
  type ActivityType,
} from "@/lib/crm-mock";

type FeedFilter = "all" | "important" | "conversations" | "notes";

export function CrmContactDetail({ contact }: { contact: CrmContact }) {
  const [stage, setStage] = useState<StageKey>(contact.stage);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [q, setQ] = useState("");
  const [composer, setComposer] = useState<null | "note" | "email">(null);
  const [activities, setActivities] = useState<Activity[]>(contact.activities);
  const s = STAGE_BY_KEY[stage];

  const changeStage = (next: StageKey) => {
    if (next === stage) return;
    setActivities((prev) => [
      {
        id: `local-${Date.now()}`,
        type: "status_change",
        when: "gerade eben",
        actor: "JH",
        from: stage,
        to: next,
      },
      ...prev,
    ]);
    setStage(next);
    toast.success(`Status → ${STAGE_BY_KEY[next].label}`);
  };

  const addActivity = (type: "note" | "email", body: string) => {
    if (!body.trim()) return;
    setActivities((prev) => [
      {
        id: `local-${Date.now()}`,
        type: type === "email" ? "email_out" : "note",
        when: "gerade eben",
        actor: "JH",
        subject: type === "email" ? "Neue E-Mail" : undefined,
        body,
      },
      ...prev,
    ]);
    setComposer(null);
    toast.success(type === "email" ? "E-Mail gesendet (Prototyp)" : "Notiz gespeichert");
  };

  const feed = useMemo(() => {
    let r = activities;
    if (filter === "important") r = r.filter((a) => a.important);
    if (filter === "conversations")
      r = r.filter((a) =>
        ["email_in", "email_out", "sms", "call"].includes(a.type),
      );
    if (filter === "notes") r = r.filter((a) => a.type === "note");
    if (q.trim()) {
      const n = q.toLowerCase();
      r = r.filter((a) =>
        [a.title, a.body, a.subject]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(n)),
      );
    }
    return r;
  }, [activities, filter, q]);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      {/* Kopfzeile */}
      <header className="flex flex-wrap items-center gap-3 border-b bg-card px-4 py-3 md:px-6">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/crm" aria-label="Zurück">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback className="bg-primary/10 font-medium text-primary">
            {initials(contact.vorname, contact.nachname)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold leading-tight">
            {contact.vorname} {contact.nachname}
          </h1>
          {/* Status-Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="mt-0.5 inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 text-xs font-medium transition hover:bg-state-hover">
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                <span className="max-w-[220px] truncate">{s.label}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
              <DropdownMenuLabel>Status ändern</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PIPELINE.map((st) => (
                <DropdownMenuItem key={st.key} onSelect={() => changeStage(st.key)}>
                  <span className={`mr-2 h-2 w-2 rounded-full ${st.dot}`} />
                  {st.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Aktionsleiste */}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <ActionButton icon={Calendar} label="Meeting" onClick={() => toast("Meeting planen (Prototyp)")} />
          <ActionButton icon={StickyNote} label="Notiz" onClick={() => setComposer("note")} />
          <ActionButton icon={Mail} label="E-Mail" onClick={() => setComposer("email")} />
          <ActionButton icon={MessageSquare} label="SMS" onClick={() => toast("SMS (Prototyp)")} />
          <ActionButton icon={Phone} label="Anruf" onClick={() => toast("Anruf (Prototyp)")} />
          <ContactActionsMenu />
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
        {/* Linke Detail-Spalte */}
        <aside className="shrink-0 space-y-4 border-b bg-card/40 p-4 lg:w-80 lg:border-b-0 lg:border-r xl:w-96">
          <Section title="Über" defaultOpen>
            <InfoRow icon={MapPin} value={contact.stadt} />
            {contact.website && (
              <InfoRow
                icon={Globe}
                value={contact.website}
                href={`https://${contact.website}`}
                external
              />
            )}
            <InfoRow icon={Mail} value={contact.email} />
            <InfoRow icon={Phone} value={contact.telefon} />
          </Section>

          {/* E-Mail-Sync */}
          <div className="rounded-lg border bg-success-soft/60 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> Postfach verbunden
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {EMAIL_SYNC.address} · {EMAIL_SYNC.provider}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3" /> Letzter Sync {EMAIL_SYNC.lastSync}
            </p>
          </div>

          {/* Verknüpftes Objekt */}
          <Section title="Zugeordnetes Objekt" defaultOpen count={contact.objekt ? 1 : 0}>
            {contact.objekt ? (
              <Link
                href="/objekte"
                className="flex items-center gap-3 rounded-lg border bg-background p-2.5 transition hover:border-primary/40"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{contact.objekt.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {contact.objekt.stadt} · {contact.objekt.kaufpreis} · {contact.objekt.wohnung}
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            ) : (
              <button
                onClick={() => toast("Objekt zuordnen (Prototyp)")}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed p-3 text-xs text-muted-foreground transition hover:bg-state-hover"
              >
                <Plus className="h-3.5 w-3.5" /> Objekt zuordnen
              </button>
            )}
          </Section>

          <Section title="Kontakte" count={1}>
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted text-xs">
                  {initials(contact.vorname, contact.nachname)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {contact.vorname} {contact.nachname}
                </div>
                <div className="truncate text-xs text-muted-foreground">{contact.email}</div>
              </div>
            </div>
          </Section>

          <Section title="Felder" count={contact.customFields.length}>
            <dl className="space-y-2">
              {contact.customFields.map((f) => (
                <div key={f.label} className="grid grid-cols-[110px_1fr] gap-2 text-sm">
                  <dt className="truncate text-xs text-muted-foreground">{f.label}</dt>
                  <dd className="min-w-0 truncate">
                    {f.href ? (
                      <Link href={f.href} className="text-primary hover:underline">
                        {f.value}
                      </Link>
                    ) : f.external ? (
                      <span className="text-primary">{f.value}</span>
                    ) : (
                      f.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        </aside>

        {/* Timeline */}
        <main className="min-w-0 flex-1 p-4 md:p-6">
          {/* Filter + Suche */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
              <FilterTab label="Alle" active={filter === "all"} onClick={() => setFilter("all")} />
              <FilterTab label="Wichtig" active={filter === "important"} onClick={() => setFilter("important")} />
              <FilterTab
                label="Konversationen"
                active={filter === "conversations"}
                onClick={() => setFilter("conversations")}
              />
              <FilterTab label="Notizen" active={filter === "notes"} onClick={() => setFilter("notes")} />
            </div>
            <div className="relative ml-auto min-w-[180px] max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Aktivitäten durchsuchen"
                className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {composer && (
            <Composer
              kind={composer}
              to={contact.email}
              onCancel={() => setComposer(null)}
              onSend={(body) => addActivity(composer, body)}
            />
          )}

          <div className="relative">
            {/* vertikale Linie */}
            <span
              className="absolute left-4 top-2 bottom-2 w-px bg-border md:left-5"
              aria-hidden
            />
            <ul className="space-y-1">
              {feed.length === 0 ? (
                <li className="py-10 text-center text-sm text-muted-foreground">
                  Keine Aktivitäten für diesen Filter.
                </li>
              ) : (
                feed.map((a) => <TimelineItem key={a.id} a={a} />)
              )}
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Mail;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="gap-1.5">
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

function ContactActionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Weitere Aktionen">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => toast.success("Selbstauskunft-Link erstellt (Prototyp)")}>
          <ClipboardList className="mr-2 h-4 w-4" /> Selbstauskunft starten
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toast.success("Reservierung gestartet (Prototyp)")}>
          <FileSignature className="mr-2 h-4 w-4" /> Reservierung starten
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => toast("Aktivität hinzufügen (Prototyp)")}>
          <Plus className="mr-2 h-4 w-4" /> Aktivität
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 transition ${
        active ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function Section({
  title,
  count,
  defaultOpen,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen ?? false}>
      <CollapsibleTrigger className="group flex w-full items-center gap-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ChevronDown className="h-3.5 w-3.5 transition group-data-[state=closed]:-rotate-90" />
        {title}
        {count != null && (
          <span className="rounded-full bg-muted px-1.5 text-[11px] font-normal">{count}</span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}

function InfoRow({
  icon: Icon,
  value,
  href,
  external,
}: {
  icon: typeof Mail;
  value: string;
  href?: string;
  external?: boolean;
}) {
  const content = (
    <span className="flex items-center gap-2 py-1 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">{value}</span>
    </span>
  );
  if (href)
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className="block text-primary hover:underline"
      >
        {content}
      </a>
    );
  return content;
}

function Composer({
  kind,
  to,
  onCancel,
  onSend,
}: {
  kind: "note" | "email";
  to: string;
  onCancel: () => void;
  onSend: (body: string) => void;
}) {
  const [body, setBody] = useState("");
  return (
    <div className="mb-4 rounded-lg border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        {kind === "email" ? <Mail className="h-4 w-4" /> : <StickyNote className="h-4 w-4" />}
        {kind === "email" ? `E-Mail an ${to}` : "Neue Notiz"}
      </div>
      <Textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={kind === "email" ? "Nachricht schreiben …" : "Notiz hinzufügen …"}
        className="min-h-24"
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button size="sm" onClick={() => onSend(body)} disabled={!body.trim()}>
          {kind === "email" ? (
            <>
              <Send className="mr-1 h-4 w-4" /> Senden
            </>
          ) : (
            "Speichern"
          )}
        </Button>
      </div>
    </div>
  );
}

/* ---------- Timeline-Einträge ---------- */

const TYPE_META: Record<
  ActivityType,
  { icon: typeof Mail; ring: string; tint: string }
> = {
  status_change: { icon: ArrowRight, ring: "bg-muted text-muted-foreground", tint: "" },
  note: { icon: StickyNote, ring: "bg-amber-100 text-amber-700", tint: "bg-amber-50/60" },
  email_in: { icon: Mail, ring: "bg-sky-100 text-sky-700", tint: "" },
  email_out: { icon: Mail, ring: "bg-sky-100 text-sky-700", tint: "" },
  call: { icon: Phone, ring: "bg-emerald-100 text-emerald-700", tint: "" },
  meeting: { icon: Calendar, ring: "bg-indigo-100 text-indigo-700", tint: "" },
  sms: { icon: MessageSquare, ring: "bg-violet-100 text-violet-700", tint: "" },
  task: { icon: Trophy, ring: "bg-muted text-muted-foreground", tint: "" },
  imported: { icon: Import, ring: "bg-muted text-muted-foreground", tint: "" },
};

function TimelineItem({ a }: { a: Activity }) {
  const meta = TYPE_META[a.type];
  const Icon = meta.icon;

  return (
    <li className="relative flex gap-3 py-2 pl-0.5">
      <span
        className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-background ${meta.ring}`}
      >
        <Icon className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        {a.type === "status_change" ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1.5 text-sm">
            <span className="text-muted-foreground">Status geändert</span>
            {a.from && <StageChip stage={a.from} />}
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            {a.to && <StageChip stage={a.to} />}
            <span className="ml-auto shrink-0 text-xs text-muted-foreground">{a.when}</span>
          </div>
        ) : a.type === "imported" ? (
          <div className="flex items-center gap-2 pt-1.5 text-sm text-muted-foreground">
            <span>{a.title ?? "Importiert"}</span>
            <span className="ml-auto text-xs">{a.when}</span>
          </div>
        ) : a.type === "email_in" || a.type === "email_out" ? (
          <EmailCard a={a} />
        ) : (
          <GenericCard a={a} />
        )}
      </div>
    </li>
  );
}

function EmailCard({ a }: { a: Activity }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          {a.type === "email_in" ? "Eingang" : "Ausgang"}
        </span>
        <span className="truncate text-sm font-medium">{a.subject}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{a.when}</span>
      </div>
      {a.body && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{a.body}</p>}
    </div>
  );
}

function GenericCard({ a }: { a: Activity }) {
  return (
    <div
      className={`rounded-lg border p-3 ${a.important ? "border-amber-200 bg-amber-50/60" : "bg-card"}`}
    >
      <div className="flex items-center gap-2">
        <Avatar className="h-5 w-5">
          <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
            {a.actor}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{a.title ?? "Notiz"}</span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">{a.when}</span>
      </div>
      {a.body && (
        <p className="mt-1.5 whitespace-pre-line text-sm text-foreground/90">{a.body}</p>
      )}
    </div>
  );
}

function StageChip({ stage }: { stage: StageKey }) {
  const s = STAGE_BY_KEY[stage];
  return (
    <span className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs font-medium">
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      <span className="max-w-[160px] truncate">{s.label}</span>
    </span>
  );
}
