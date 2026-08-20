import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>
      {/* Profile card */}
      <div className="glass rounded-xl p-6 space-y-4">
        <Skeleton className="h-4 w-20" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
        </div>
      </div>
      {/* Usage card */}
      <div className="glass rounded-xl p-6 space-y-4">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      </div>
      {/* Session card */}
      <div className="glass rounded-xl p-6">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
