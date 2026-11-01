"use client";

import {
  CheckIcon,
  ChevronLeftIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { strings } from "@/lib/strings";
import type { SyncStatus } from "@/lib/workout/use-workout-sync";
import { ElapsedTime } from "./elapsed-time";

const { header, status: statusCopy } = strings.workout;

type WorkoutHeaderProps = {
  title: string;
  startedAt: string;
  status: SyncStatus;
  onRetry: () => void;
  onDelete: () => void;
};

// Sticky glass header: the way home (the workout stays open), name, elapsed time, save state.
export function WorkoutHeader({ title, startedAt, status, onRetry, onDelete }: WorkoutHeaderProps) {
  return (
    <header className="sticky top-0 z-20 -mx-5 -mt-[env(safe-area-inset-top)] border-b border-white/60 bg-surface/75 px-5 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="flex min-h-16 items-center gap-2 py-2">
        <Link
          href="/"
          aria-label={header.back}
          className="-ms-2.5 flex size-11 shrink-0 items-center justify-center rounded-md text-ink transition-colors active:bg-blush"
        >
          {/* "Back" points to the start side, which is right in RTL. */}
          <ChevronLeftIcon aria-hidden="true" className="size-6 rtl:-scale-x-100" />
        </Link>

        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="text-section font-medium wrap-break-word">{title}</h1>
          <p className="flex items-center gap-2 text-label text-ink-muted">
            <span className="sr-only">{header.elapsed}</span>
            <ElapsedTime startedAt={startedAt} />
            <span aria-hidden="true">·</span>
            <SaveStatus status={status} onRetry={onRetry} />
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={header.menu}
            render={
              <button
                type="button"
                className="-me-2.5 flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors active:bg-blush"
              />
            }
          >
            <EllipsisVerticalIcon aria-hidden="true" className="size-6" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <TrashIcon aria-hidden="true" />
              {header.deleteWorkout}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// A quiet line: "saving" / "saved", or "not saved" with a retry (SPEC.md: the change stays
// queued and is sent again when the connection returns).
function SaveStatus({ status, onRetry }: { status: SyncStatus; onRetry: () => void }) {
  if (status === "failed") {
    return (
      <button
        type="button"
        onClick={onRetry}
        aria-describedby="save-failed-hint"
        // The negative margin keeps a 44px hit area without making the line taller.
        className="-mx-2 -my-3 flex items-center gap-1 rounded-md px-2 py-3 font-medium text-warning active:bg-blush"
      >
        <ExclamationTriangleIcon aria-hidden="true" className="size-5" />
        <span role="status">{statusCopy.failed}</span>
        <span aria-hidden="true">·</span>
        <span className="underline underline-offset-2">{statusCopy.retry}</span>
        <span id="save-failed-hint" className="sr-only">
          {statusCopy.failedHint}
        </span>
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1">
      {/* The icon slot stays reserved while saving, so the line doesn't shift. */}
      <CheckIcon aria-hidden="true" className={status === "saving" ? "invisible size-5" : "size-5 text-success"} />
      {status === "saving" ? statusCopy.saving : statusCopy.saved}
    </span>
  );
}
