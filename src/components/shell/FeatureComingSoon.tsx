import Link from "next/link";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * V1 soft-gate: a deferred area is reachable by URL but renders this notice
 * instead of its real content. The feature's components and data layer stay in
 * the codebase untouched — only the page entry points to this until V2.
 */
export function FeatureComingSoon({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-xl border border-dashed border-brand-border bg-card p-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-surfaceMuted text-brand-subtle">
          <Clock className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-semibold text-brand-ink">{title}</h1>
        <p className="mt-2 text-sm text-brand-muted">
          {description ??
            "Dieser Bereich ist in einer späteren Version verfügbar. Für V1 liegt der Fokus auf Objekten, Kunden, Reservierungen und Team."}
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/dashboard">Zurück zum Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
