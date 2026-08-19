import { Skeleton } from "@/components/ui/skeleton";

export default function ApplicationDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-[86rem]" aria-busy="true" aria-label="Loading application">
      <Skeleton className="h-8 w-40" />
      <div className="mt-5 rounded-lg border border-border bg-card p-6">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-5 h-12 w-3/5" />
        <Skeleton className="mt-3 h-6 w-1/4" />
        <div className="mt-8 grid grid-cols-3 gap-5"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
      </div>
      <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,0.5fr)]">
        <Skeleton className="h-[34rem]" />
        <div className="space-y-7"><Skeleton className="h-44" /><Skeleton className="h-80" /></div>
      </div>
    </div>
  );
}
