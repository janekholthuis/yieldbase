import { Skeleton } from "@/components/ui/skeleton";

// Instant Suspense fallback while the Einstellungen server component fetches.
export default function EinstellungenLoading() {
  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-60" />
      </div>

      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-4 rounded-xl border bg-card p-5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
