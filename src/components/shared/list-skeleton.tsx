import { TopBar } from "@/components/layout/top-bar";
import { Skeleton } from "@/components/ui/skeleton";

// Loading state shaped like a titled list screen.
export function ListSkeleton({ title, backHref, rows = 6 }: { title?: string; backHref?: string; rows?: number }) {
  return (
    <div aria-busy="true">
      {title ? <TopBar title={title} backHref={backHref} /> : <Skeleton className="my-5 h-7 w-40" />}
      <Skeleton className="h-12 w-full" />
      <div className="mt-4 flex flex-col gap-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
