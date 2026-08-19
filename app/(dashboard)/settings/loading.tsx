import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return <div className="mx-auto w-full max-w-4xl" aria-busy="true"><Skeleton className="h-4 w-36" /><Skeleton className="mt-4 h-12 w-72" /><Skeleton className="mt-8 h-[34rem]" /></div>;
}
