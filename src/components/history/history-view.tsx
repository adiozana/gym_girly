"use client";

import { CalendarDaysIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState } from "react";
import { MonthCalendar } from "@/components/dashboard/month-calendar";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { inMonth, monthOf, type MonthKey } from "@/lib/dashboard/calendar";
import type { GoalData } from "@/lib/dashboard/queries";
import { formatDayAndDate } from "@/lib/format-date";
import { strings } from "@/lib/strings";
import { useToday } from "@/lib/use-today";

const { calendar: copy } = strings.dashboard;

// The history tab (SPEC.md "היסטוריה"): the month calendar and that month's workouts below it.
export function HistoryView({ data }: { data: GoalData }) {
  const today = useToday();
  if (!today) return <Skeleton className="h-96 w-full" />;
  return <HistoryForDay data={data} today={today} />;
}

function HistoryForDay({ data, today }: { data: GoalData; today: string }) {
  const [month, setMonth] = useState<MonthKey>(() => monthOf(today));

  if (data.sessions.length === 0) {
    return <EmptyState icon={CalendarDaysIcon} title={strings.history.emptyTitle} body={strings.history.emptyBody} />;
  }

  const monthSessions = data.sessions.filter((s) => inMonth(s.date, month)).reverse();

  return (
    <div className="flex flex-col gap-8">
      <MonthCalendar goals={data.goals} sessions={data.sessions} today={today} month={month} onMonthChange={setMonth} />
      <section aria-labelledby="month-workouts" className="flex flex-col gap-2">
        <h2 id="month-workouts" className="text-section font-medium">
          {copy.monthWorkouts}
        </h2>
        {monthSessions.length === 0 ? (
          <p className="text-ink-muted">{copy.noWorkoutsThisMonth}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {monthSessions.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/sessions/${session.id}`}
                  className="flex min-h-16 items-center gap-3 rounded-md border border-hairline bg-surface px-4 py-3 active:bg-blush/60"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium wrap-break-word">{session.name ?? strings.workout.freeWorkout}</span>
                    <bdi className="text-caption text-ink-muted">{formatDayAndDate(session.date)}</bdi>
                  </span>
                  <ChevronRightIcon aria-hidden="true" className="size-5 shrink-0 text-ink-subtle rtl:-scale-x-100" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
