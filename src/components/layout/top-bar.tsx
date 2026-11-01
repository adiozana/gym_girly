import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { ReactNode } from "react";
import { strings } from "@/lib/strings";

type TopBarProps = {
  title: ReactNode;
  backHref?: string;
  // At most one action, at the end side (design skill).
  action?: ReactNode;
};

export function TopBar({ title, backHref, action }: TopBarProps) {
  return (
    <header className="flex min-h-16 items-center gap-2 py-2">
      {backHref && (
        <Link
          href={backHref}
          aria-label={strings.common.back}
          className="-ms-2.5 flex size-11 shrink-0 items-center justify-center rounded-md text-ink transition-colors active:bg-blush"
        >
          {/* "Back" points to the start side, which is right in RTL. */}
          <ChevronLeftIcon aria-hidden="true" className="size-6 rtl:-scale-x-100" />
        </Link>
      )}
      <h1
        className={
          backHref
            ? "min-w-0 flex-1 text-section font-medium wrap-break-word"
            : "min-w-0 flex-1 text-title font-semibold wrap-break-word"
        }
      >
        {title}
      </h1>
      {action && <div className="-me-2.5 shrink-0">{action}</div>}
    </header>
  );
}
