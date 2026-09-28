import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading farmer">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-6 w-72" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-20 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
