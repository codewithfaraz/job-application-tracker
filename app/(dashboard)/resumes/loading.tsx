import { Skeleton } from "@/components/ui/skeleton";

export default function ResumesLoading() {
  return (
    <div className="mx-auto w-full max-w-[86rem]" aria-busy="true">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-4 h-12 w-64" />
      <Skeleton className="mt-3 h-5 w-[34rem] max-w-full" />
      <div className="mt-10 grid gap-7 xl:grid-cols-[0.7fr_1.3fr]">
        <Skeleton className="h-[30rem]" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-64" />
          ))}
        </div>
      </div>
    </div>
  );
}
