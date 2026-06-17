import { Skeleton } from "@/components/ui/skeleton";

// Instant Suspense fallback while the Projekt-Detail server component fetches.
// Mirrors ProjektDetailView (hero + 6 stat cards + tabs).
export default function ProjektDetailLoading() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <Skeleton className="h-8 w-40" />

      <div className="grid items-start gap-5 lg:grid-cols-[1fr_minmax(0,360px)]">
        <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
        <div className="space-y-3 rounded-2xl border bg-card p-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="mt-4 h-9 w-40" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-full" />
        ))}
      </div>

      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
