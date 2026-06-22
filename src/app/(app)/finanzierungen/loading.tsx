import { Skeleton } from "@/components/ui/skeleton";

// Instant Suspense fallback while the Finanzierungen server component fetches.
export default function FinanzierungenLoading() {
  return (
    <div className="container mx-auto space-y-4 p-4 md:p-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border bg-card p-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-7 w-28 rounded-full" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
