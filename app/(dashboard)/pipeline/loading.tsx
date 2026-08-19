import { Skeleton } from "@/components/ui/skeleton";

export default function PipelineLoading() {
  return (
    <div className="mx-auto w-full max-w-[100rem]" aria-busy="true">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-4 h-12 w-80 max-w-full" />
      <Skeleton className="mt-3 h-5 w-[32rem] max-w-full" />
      <div className="mt-10 grid auto-cols-[18rem] grid-flow-col gap-4 overflow-hidden">
        {[0, 1, 2, 3].map((column) => (
          <Skeleton key={column} className="h-[28rem]" />
        ))}
      </div>
    </div>
  );
}
