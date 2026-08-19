import { ApplicationListSkeleton } from "@/components/applications/application-list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ApplicationsLoading() {
  return (
    <div className="mx-auto w-full max-w-[86rem]">
      <div className="border-b border-border pb-7">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="mt-4 h-12 w-72 max-w-full" />
        <Skeleton className="mt-3 h-5 w-[34rem] max-w-full" />
      </div>
      <div className="mt-7">
        <ApplicationListSkeleton />
      </div>
    </div>
  );
}
