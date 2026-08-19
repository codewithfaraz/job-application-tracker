import { Skeleton } from "@/components/ui/skeleton";

function ApplicationListSkeleton() {
  return (
    <div aria-label="Loading applications" aria-busy="true" className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <div className="flex gap-3">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 w-28" />
        </div>
        <Skeleton className="mt-4 h-10 w-full" />
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="grid gap-5 border-b border-border p-5 last:border-b-0 lg:grid-cols-[minmax(14rem,1.1fr)_minmax(21rem,1.4fr)_9rem_3rem] lg:items-center">
            <div>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="mt-3 h-6 w-4/5" />
              <Skeleton className="mt-2 h-4 w-2/5" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
            <Skeleton className="h-9" />
            <Skeleton className="size-9" />
          </div>
        ))}
      </div>
    </div>
  );
}

export { ApplicationListSkeleton };
