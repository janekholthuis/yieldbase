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
  ChevronRight,
  MoreHorizontal,
  Search,
  Building2,
  Plus,
  Send,
  Flag,
  Info,
  Trophy,
  Contact as ContactIcon,
  ListChecks,
  ArrowRight,
  Repeat2,
  Database,
  SlidersHorizontal,
  FileSignature,
  ClipboardList,
  Moon,
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
  PIPELINE,
  STAGE_BY_KEY,
  initials,
  type CrmContact,
  type StageKey,
  type Activity,
} from "@/lib/crm-mock";

type FeedFilter = "all" | "important" | "conversations" | "notes";

export function CrmContactDetail({ contact }: { contact: CrmContact }) {
  const [stage, setStage] = useState<StageKey>(contact.stage);
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [q, setQ] = useState("");
  const [composer, setComposer] = useState<null | "note" | "email">(null);
  const [tab, setTab] = useState<"details" | "files">("details");
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
      r = r.filter((a) => ["email_in", "email_out", "sms", "call"].includes(a.type));
    if (filter === "notes") r = r.filter((a) => a.type === "note");
    if (q.trim()) {
      const n = q.toLowerCase();
      r = r.filter((a) =>
        [a.title, a.body, a.subject].filter(Boolean).some((v) => String(v).toLowerCase().includes(n)),
      );
    }
    return r;
  }, [activities, filter, q]);

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col bg-brand-surfaceMuted dark:bg-background">
      {/* Kopfzeile */}
      <header className="flex flex-wrap items-center gap-3 bg-background px-4 py-3.5 md:px-6">
        <Button variant="ghost" size="icon" asChild className="shrink-0 md:hidden">
          <Link href="/crm" aria-label="Zurück">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-background">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold leading-tight">
            {contact.vorname} {contact.nachname}
          </h1>
          {/* Status-Dropdown */}
          <div className="mt-1 flex items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition hover:brightness-95 ${s.soft}`}
                >
                  <Flag className="h-3 w-3" />
                  <span className="max-w-[240px] truncate">{s.label}</span>
                  <ChevronDown className="h-3 w-3 opacity-70" />
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
            <ContactActionsMenu />
          </div>
        </div>

        {/* Aktionsleiste */}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <ActionButton icon={Calendar} label="Meeting" onClick={() => toast("Meeting planen (Prototyp)")} />
          <ActionButton icon={StickyNote} label="Note" onClick={() => setComposer("note")} />
          <ActionButton icon={Mail} label="Email" onClick={() => setComposer("email")} />
          <ActionButton icon={MessageSquare} label="SMS" onClick={() => toast("SMS (Prototyp)")} />
          <ActionButton icon={Phone} label="Call" chevron onClick={() => toast("Anruf (Prototyp)")} />
          <ActionButton icon={Flag} label="Activity" chevron onClick={() => toast("Aktivität (Prototyp)")} />
        </div>
      </header>

      <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
        {/* Linke Detail-Spalte */}
        <aside className="shrink-0 border-t bg-background lg:w-[340px] lg:border-r xl:w-[380px]">
          {/* Details / Files */}
          <div className="flex items-center gap-5 border-b px-4 text-sm">
            <button
              onClick={() => setTab("details")}
              className={`-mb-px border-b-2 py-2.5 font-medium transition ${
                tab === "details"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setTab("files")}
              className={`-mb-px border-b-2 py-2.5 font-medium transition ${
                tab === "files"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Files
            </button>
          </div>

          {tab === "files" ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Keine Dateien.</div>
          ) : (
            <div className="space-y-2.5 p-3">
              <SectionCard icon={Info} title="About">
                <div className="space-y-1.5 text-sm">
                  <MetaLine label="Adresse" value={contact.stadt} />
                  {contact.website && (
                    <MetaLine
                      label="Website"
                      value={contact.website}
                      href={`https://${contact.website}`}
                    />
                  )}
                  <MetaLine label="Beschreibung" value="—" />
                </div>
              </SectionCard>

              <SectionCard icon={ListChecks} title="Tasks" count={0} onAdd />
              <SectionCard icon={Trophy} title="Opportunities" count={0} onAdd />

              <SectionCard icon={ContactIcon} title="Contacts" count={1} defaultOpen search onAdd>
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-muted text-xs">
                      {initials(contact.vorname, contact.nachname)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1 truncate text-sm font-medium">
                      {contact.vorname} {contact.nachname}
                      <Moon className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="E-Mail"
                  >
                    <Mail className="h-4 w-4" />
                  </a>
                  <a
                    href={`tel:${contact.telefon}`}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Anrufen"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                </div>
              </SectionCard>

              <SectionCard
                icon={SlidersHorizontal}
                title="Custom Fields"
                count={contact.customFields.length}
                defaultOpen
                search
                onAdd
                more
              >
                <dl className="space-y-1.5">
                  {contact.customFields.map((f) => (
                    <div key={f.label} className="grid grid-cols-[120px_1fr] items-center gap-2 text-sm">
                      <dt className="truncate text-muted-foreground">{f.label}</dt>
                      <dd className="min-w-0 truncate">
                        {f.person ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[8px] font-semibold text-primary">
                              JH
                            </span>
                            {f.value}
                          </span>
                        ) : f.href ? (
                          <Link href={f.href} className="text-primary hover:underline">
                            {f.value}
                          </Link>
                        ) : f.external ? (
                          <a
                            href="#"
                            onClick={(e) => e.preventDefault()}
                            className="truncate text-primary hover:underline"
                          >
                            {f.value}
                          </a>
                        ) : (
                          f.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </SectionCard>
            </div>
          )}
        </aside>

        {/* Timeline */}
        <main className="min-w-0 flex-1 bg-background lg:border-t-0">
          {/* Filter + Suche */}
          <div className="flex flex-wrap items-center gap-2 border-y px-4 py-2.5 md:px-6 lg:border-t-0">
            <div className="flex items-center gap-1 text-sm">
              <FilterTab label="All" active={filter === "all"} onClick={() => setFilter("all")} />
              <FilterTab label="Important" active={filter === "important"} onClick={() => setFilter("important")} />
              <FilterTab
                label="Conversations"
                active={filter === "conversations"}
                onClick={() => setFilter("conversations")}
              />
              <FilterTab label="Notes & Summaries" active={filter === "notes"} onClick={() => setFilter("notes")} />
            </div>
            <div className="relative ml-auto min-w-[180px] max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search keywords, people, and activities"
                className="h-9 w-full rounded-lg border bg-muted/40 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground hover:bg-state-hover"
              aria-label="Filtern"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="px-4 py-4 md:px-6">
            {composer && (
              <Composer
                kind={composer}
                to={contact.email}
                onCancel={() => setComposer(null)}
                onSend={(body) => addActivity(composer, body)}
              />
            )}

            <ul className="space-y-1">
              {feed.length === 0 ? (
                <li className="py-16 text-center text-sm text-muted-foreground">
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

/* ---------- Kopfzeile ---------- */

function ActionButton({
  icon: Icon,
  label,
  chevron,
  onClick,
}: {
  icon: typeof Mail;
  label: string;
  chevron?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-sm font-medium text-foreground transition hover:bg-state-hover"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="hidden sm:inline">{label}</span>
      {chevron && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
    </button>
  );
}

function ContactActionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition hover:bg-state-hover"
          aria-label="Weitere Aktionen"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Aktionen</DropdownMenuLabel>
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

/* ---------- Linke Spalte ---------- */

function SectionCard({
  icon: Icon,
  title,
  count,
  defaultOpen,
  search,
  onAdd,
  more,
  children,
}: {
  icon: typeof Mail;
  title: string;
  count?: number;
  defaultOpen?: boolean;
  search?: boolean;
  onAdd?: boolean;
  more?: boolean;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </span>
          {count != null && <span className="text-xs text-muted-foreground/70">{count}</span>}
        </button>
        <div className="flex items-center gap-1 text-muted-foreground">
          {more && <IconBtn icon={MoreHorizontal} label="Mehr" />}
          {search && <IconBtn icon={Search} label="Suchen" />}
          {onAdd && <IconBtn icon={Plus} label="Hinzufügen" />}
        </div>
      </div>
      {open && children && <div className="border-t px-3 py-3">{children}</div>}
    </div>
  );
}

function IconBtn({ icon: Icon, label }: { icon: typeof Mail; label: string }) {
  return (
    <button
      onClick={() => toast(`${label} (Prototyp)`)}
      className="flex h-6 w-6 items-center justify-center rounded-md transition hover:bg-state-hover hover:text-foreground"
      aria-label={label}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function MetaLine({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-2">
      <span className="text-muted-foreground">{label}</span>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">
          {value}
        </a>
      ) : (
        <span className="min-w-0 truncate">{value}</span>
      )}
    </div>
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
      className={`rounded-md px-3 py-1.5 transition ${
        active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

/* ---------- Composer ---------- */

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
    <div className="mb-4 rounded-xl border bg-background p-3 shadow-sm">
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

/* ---------- Timeline ---------- */

function TimelineItem({ a }: { a: Activity }) {
  if (a.type === "status_change") return <StatusRow a={a} />;
  if (a.type === "imported") return <ImportedRow a={a} />;
  if (a.type === "email_in" || a.type === "email_out") return <EmailRow a={a} />;
  return <NoteRow a={a} />;
}

function Rail({
  icon: Icon,
  square,
  tone,
}: {
  icon: typeof Mail;
  square?: boolean;
  tone: string;
}) {
  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center ${
        square ? "rounded-md" : "rounded-full"
      } ${tone}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </span>
  );
}

function Actor({ actor, when }: { actor: string; when: string }) {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-2 pl-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary">
        {actor}
      </span>
      <span className="text-xs text-muted-foreground">{when}</span>
    </div>
  );
}

function StatusRow({ a }: { a: Activity }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <Rail icon={Repeat2} tone="bg-muted text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm text-muted-foreground">Status changed from</span>
        {a.from && <StatusPill stage={a.from} />}
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
        {a.to && <StatusPill stage={a.to} />}
      </div>
      <Actor actor={a.actor} when={a.when} />
    </li>
  );
}

function ImportedRow({ a }: { a: Activity }) {
  return (
    <li className="flex items-center gap-3 py-2">
      <Rail icon={Database} tone="bg-muted text-muted-foreground" />
      <span className="text-sm text-muted-foreground">{a.title ?? "Imported via API"}</span>
      <Actor actor={a.actor} when={a.when} />
    </li>
  );
}

function NoteRow({ a }: { a: Activity }) {
  const [expanded, setExpanded] = useState(false);
  const lines = (a.body ?? "").split("\n");
  const preview = lines[0];
  const hasMore = lines.length > 1;

  return (
    <li className="flex gap-3 py-2">
      <Rail icon={StickyNote} square tone="bg-warning-soft text-warning" />
      <div className="min-w-0 flex-1 rounded-xl border bg-background p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Janek Holthuis created a note</span>
          <Actor actor={a.actor} when={a.when} />
        </div>
        <p className="mt-1.5 whitespace-pre-line text-sm text-foreground/90">
          {expanded ? a.body : preview}
          {!expanded && hasMore && <span className="text-muted-foreground"> …</span>}
        </p>
        {hasMore && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 text-sm text-primary hover:underline"
          >
            {expanded ? "Show less" : "Show more…"}
          </button>
        )}
      </div>
    </li>
  );
}

function EmailRow({ a }: { a: Activity }) {
  return (
    <li className="flex gap-3 py-2">
      <Rail icon={Mail} tone="bg-info-soft text-info" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{a.subject}</span>
          <Actor actor={a.actor} when={a.when} />
        </div>
        {a.body && (
          <div className="mt-1.5 flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{a.body}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{a.when}</span>
          </div>
        )}
      </div>
    </li>
  );
}

function StatusPill({ stage }: { stage: StageKey }) {
  const s = STAGE_BY_KEY[stage];
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${s.soft}`}
    >
      <Icon className="h-3 w-3" />
      <span className="max-w-[260px] truncate">{s.label}</span>
    </span>
  );
}
