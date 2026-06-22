import { Skeleton } from "@/components/ui/skeleton";

// Instant Suspense fallback while the Kunden server component fetches.
export default function KundenLoading() {
  return (
    <div className="container mx-auto space-y-4 p-4 md:p-6">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-10 w-full max-w-md flex-1" />
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="space-y-2 rounded-xl border bg-card p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg p-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
