"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  listMyNotifications,
  markNotificationsRead,
} from "@/lib/actions/notifications";

export interface NotificationItem {
  id: string;
  titel: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

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

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [items, setItems] = useState<NotificationItem[]>([]);
  const unread = items.filter((i) => !i.read_at);

  // Load on mount, then refresh whenever the popover is opened.
  useEffect(() => {
    let cancelled = false;
    listMyNotifications()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        // Notifications are non-critical; fail silently.
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const markRead = (ids?: string[]) => {
    // Optimistic update, then persist.
    const now = new Date().toISOString();
    setItems((prev) =>
      prev.map((n) =>
        !ids || ids.includes(n.id) ? { ...n, read_at: n.read_at ?? now } : n,
      ),
    );
    void markNotificationsRead(ids).catch(() => {
      // Best-effort; the optimistic state already reflects the intent.
    });
  };

  const handleClick = (n: NotificationItem) => {
    if (!n.read_at) markRead([n.id]);
    setOpen(false);
    if (n.link) {
      try {
        const url = new URL(n.link, window.location.origin);
        router.push(url.pathname + url.search);
      } catch {
        // Fallback hard navigation (router.push needs a relative path)
        // eslint-disable-next-line react-hooks/immutability
        window.location.href = n.link;
      }
    }
  };

  // design: navy+gold token-map for NotificationBell
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Benachrichtigungen"
          className="relative text-brand-muted hover:bg-brand-primaryTint hover:text-brand-primary"
        >
          <Bell className="h-4 w-4" />
          {unread.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[10px] font-semibold text-white">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 overflow-hidden rounded-xl border border-brand-borderSoft p-0 shadow-popover"
      >
        <div className="flex items-center justify-between gap-2 border-b border-brand-divider bg-brand-surfaceMuted px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primaryTint text-brand-primary">
              <Bell className="h-3.5 w-3.5" />
            </span>
            <div className="text-sm font-semibold text-brand-primary">Benachrichtigungen</div>
          </div>
          {unread.length > 0 && (
            <button
              type="button"
              onClick={() => markRead(undefined)}
              className="text-xs font-medium text-brand-primary hover:underline"
            >
              Alle gelesen
            </button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-brand-muted">
              Keine Benachrichtigungen.
            </div>
          ) : (
            <ul className="divide-y divide-brand-divider">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className="block w-full text-left transition-colors hover:bg-brand-surfaceMuted"
                  >
                    <div
                      className={`flex flex-col gap-0.5 px-4 py-3 text-sm ${
                        n.read_at ? "opacity-60" : "bg-brand-primaryTint/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold leading-snug text-brand-primary">
                          {n.titel}
                        </span>
                        {!n.read_at && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-accent" />
                        )}
                      </div>
                      {n.body && (
                        <div className="text-xs leading-snug text-brand-body">
                          {n.body}
                        </div>
                      )}
                      <div className="text-[10px] text-brand-subtle">
                        {relTime(n.created_at)}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
// Badge-Import nicht mehr nötig (Counter inline gestylt)
