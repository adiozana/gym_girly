import { CalendarDaysIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { listCompletedSessions } from "@/lib/history/queries";
import { formatDayAndDate } from "@/lib/format-date";
import { strings } from "@/lib/strings";

export const metadata: Metadata = { title: strings.history.title };


// Saved workouts, newest first. Stage 5 adds the monthly calendar above the list.
export default function HistoryPage() {
  return (
    <Suspense fallback={<ListSkeleton title={strings.history.title} rows={5} />}>
      <History />
    </Suspense>
  );
}

async function History() {
  const sessions = await listCompletedSessions();
  return (
    <>
      <TopBar title={strings.history.title} />
      {sessions.length === 0 ? (
        <EmptyState icon={CalendarDaysIcon} title={strings.history.emptyTitle} body={strings.history.emptyBody} />
      ) : (
        <ul className="flex flex-col gap-2">
          {sessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/sessions/${session.id}`}
                className="flex min-h-16 items-center gap-3 rounded-md border border-hairline bg-surface px-4 py-3 active:bg-blush/60"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium wrap-break-word">{session.template_name ?? strings.workout.freeWorkout}</span>
                  <span className="text-caption text-ink-muted">
                    <bdi>{formatDayAndDate(session.session_date)}</bdi>
                    {" · "}
                    {strings.history.exerciseCount(session.exercise_count)}
                  </span>
                </span>
                <ChevronRightIcon aria-hidden="true" className="size-5 shrink-0 text-ink-subtle rtl:-scale-x-100" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
