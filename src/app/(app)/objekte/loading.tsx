import { Skeleton } from "@/components/ui/skeleton";

// Instant Suspense fallback while the Objekte server component fetches.
// Mirrors ObjekteListView's layout so navigation feels immediate.
export default function ObjekteLoading() {
  return (
    <div className="container mx-auto space-y-4 p-4 md:p-6">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-10 w-full max-w-md flex-1" />
        <Skeleton className="h-10 w-28" />
        <Skeleton className="h-10 w-44" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border bg-card p-3">
            <Skeleton className="aspect-[4/3] w-full rounded-lg" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
