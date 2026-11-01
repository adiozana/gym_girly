import { Skeleton } from "@/components/ui/skeleton";

// Loading state shaped like the workout screen: header, two exercise cards, bottom bar.
export function WorkoutSkeleton() {
  return (
    <div aria-busy="true">
      <div className="flex min-h-16 items-center gap-3 py-2">
        <Skeleton className="size-6" />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="flex flex-col gap-4 pt-4">
        {[0, 1].map((card) => (
          <div key={card} className="flex flex-col gap-3 rounded-md border border-hairline bg-surface p-4">
            <Skeleton className="h-6 w-2/3" />
            {[0, 1, 2].map((row) => (
              <Skeleton key={row} className="h-12 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
