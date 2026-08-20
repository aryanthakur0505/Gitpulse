import { Skeleton } from "@/components/ui/skeleton";

export default function RepositoryDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Skeleton className="h-4 w-24" />
      {/* Header card */}
      <div className="glass rounded-xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-72" />
            <Skeleton className="h-4 w-96" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-9 w-28 rounded-xl" />
            <div className="flex gap-1.5">
              <Skeleton className="h-7 w-20 rounded-lg" />
              <Skeleton className="h-7 w-16 rounded-lg" />
            </div>
          </div>
        </div>
        {/* Stat pills */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
      {/* Conversations */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-36" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
      </div>
    </div>
  );
}
