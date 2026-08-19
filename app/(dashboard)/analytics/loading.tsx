import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return <div className="mx-auto w-full max-w-[96rem]" aria-busy="true"><Skeleton className="h-4 w-40" /><Skeleton className="mt-4 h-12 w-80 max-w-full" /><div className="mt-10 grid gap-1 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-36" />)}</div><div className="mt-8 grid gap-7 xl:grid-cols-2"><Skeleton className="h-96" /><Skeleton className="h-96" /></div></div>;
}
