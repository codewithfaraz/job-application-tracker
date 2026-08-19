import { Skeleton } from "@/components/ui/skeleton";

export default function NewApplicationLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl" aria-busy="true" aria-label="Loading application form">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-6 h-12 w-80 max-w-full" />
      <Skeleton className="mt-3 h-5 w-[32rem] max-w-full" />
      <div className="mt-8 rounded-lg border border-border bg-card p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <Skeleton className="mt-6 h-24 w-full" />
      </div>
      <Skeleton className="mt-6 h-16 w-full" />
    </div>
  );
}
