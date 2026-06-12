"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useAuth } from "@/lib/auth-context";
import { navigableNav } from "@/lib/navigation";
import { searchEntities, type SearchResult } from "@/lib/actions/search";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { roles } = useAuth();
  const items = navigableNav(roles);
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounced live search against units / projects / customers (RLS-scoped).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const t = setTimeout(() => {
      searchEntities(q)
        .then((r) => {
          if (!cancelled) setSearchResults(r);
        })
        .catch(() => {
          if (!cancelled) setSearchResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  // Reset the query on close so the palette reopens clean.
  const handleOpenChange = (v: boolean) => {
    if (!v) setQuery("");
    onOpenChange(v);
  };

  const go = (to: string) => {
    handleOpenChange(false);
    router.push(to);
  };

  const grouped = (group: SearchResult["group"]) =>
    searchResults.filter((r) => r.group === group);

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      {/* shouldFilter off: results come pre-filtered from the server. */}
      <CommandInput
        placeholder="Objekte, Kunden oder Seiten suchen …"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? "Suche läuft …" : "Keine Ergebnisse."}
        </CommandEmpty>

        {(["Objekte", "Projekte", "Kunden"] as const).map((group) => {
          const rows = grouped(group);
          if (rows.length === 0) return null;
          return (
            <CommandGroup key={group} heading={group}>
              {rows.map((r) => (
                <CommandItem
                  key={`${group}-${r.id}`}
                  // Include title + subtitle so cmdk's built-in filter keeps
                  // server matches (e.g. a unit matched via its project name).
                  value={`${r.title} ${r.subtitle ?? ""} ${r.id}`}
                  onSelect={() => go(r.to)}
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate">{r.title}</span>
                    {r.subtitle && (
                      <span className="truncate text-xs text-muted-foreground">
                        {r.subtitle}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}

        <CommandGroup heading="Navigation">
          {items.map((i) => (
            <CommandItem
              key={i.to}
              value={`nav-${i.title}`}
              onSelect={() => go(i.to)}
            >
              <i.icon className="mr-2 h-4 w-4" />
              {i.title}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  return { open, setOpen };
}
