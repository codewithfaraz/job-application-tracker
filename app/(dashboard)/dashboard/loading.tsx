import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return <div className="mx-auto w-full max-w-[86rem]" aria-busy="true"><Skeleton className="h-4 w-36" /><Skeleton className="mt-4 h-12 w-80 max-w-full" /><div className="mt-10 grid gap-1 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-36" />)}</div><div className="mt-7 grid gap-7 xl:grid-cols-[1.35fr_0.65fr]"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>;
}
