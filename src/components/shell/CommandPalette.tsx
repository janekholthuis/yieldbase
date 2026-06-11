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
import { visibleNav } from "@/lib/navigation";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { roles } = useAuth();
  const items = visibleNav(roles);
  const router = useRouter();

  // TODO(migration): wire data-search results to a server action.
  // Static nav navigation works without a backend; search results stay empty for now.
  const searchResults: { id: string; title: string; to: string }[] = [];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Suchen oder navigieren …" />
      <CommandList>
        <CommandEmpty>Keine Ergebnisse.</CommandEmpty>
        <CommandGroup heading="Navigation">
          {items.map((i) => (
            <CommandItem
              key={i.to}
              value={i.title}
              onSelect={() => {
                onOpenChange(false);
                router.push(i.to);
              }}
            >
              <i.icon className="mr-2 h-4 w-4" />
              {i.title}
            </CommandItem>
          ))}
        </CommandGroup>
        {searchResults.length > 0 && (
          <CommandGroup heading="Ergebnisse">
            {searchResults.map((r) => (
              <CommandItem
                key={r.id}
                value={r.title}
                onSelect={() => {
                  onOpenChange(false);
                  router.push(r.to);
                }}
              >
                {r.title}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
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
