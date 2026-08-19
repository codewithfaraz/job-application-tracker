import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return <div className="mx-auto w-full max-w-5xl" aria-busy="true"><Skeleton className="h-4 w-40" /><Skeleton className="mt-4 h-12 w-80 max-w-full" /><div className="mt-10 space-y-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-48" />)}</div></div>;
}
