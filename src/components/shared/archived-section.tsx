import { ChevronDownIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

// Collapsed list of archived items at the bottom of a screen, opened on demand.
export function ArchivedSection({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <details className="group mt-8 border-t border-hairline pt-2">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-label font-medium text-ink-muted [&::-webkit-details-marker]:hidden">
        <span>
          {title} <span className="tabular-nums">({count})</span>
        </span>
        <ChevronDownIcon aria-hidden="true" className="size-5 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="pb-2">{children}</div>
    </details>
  );
}
