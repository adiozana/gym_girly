"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { cn } from "cn";
import { parseISO } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Sheet } from "@/components/shared/sheet";
import { getDayStatus, type DayStatus, type Goal } from "@/lib/calc";
import { monthGrid, monthTitle, shiftMonth, type MonthKey } from "@/lib/dashboard/calendar";
import type { CalendarSession } from "@/lib/dashboard/queries";
import { formatDate } from "@/lib/format-date";
import { strings } from "@/lib/strings";

const { calendar: copy } = strings.dashboard;

type MonthCalendarProps = {
  goals: readonly Goal[];
  sessions: readonly CalendarSession[];
  today: string;
  month: MonthKey;
  onMonthChange: (month: MonthKey) => void;
};

// Visual per status (design skill: trained days filled blush, today outlined in rose-deep).
const dayClass: Record<DayStatus, string> = {
  trained: "bg-blush-strong text-ink font-medium",
  rest: "text-ink-muted",
  missed: "text-danger ring-1 ring-danger/40 ring-inset",
  pending: "text-ink",
  planned_training: "text-ink ring-1 ring-hairline ring-inset",
  planned_rest: "text-ink-subtle",
  no_goal: "text-ink-subtle",
};

// The month, starting on Sunday (SPEC.md "לוח חודשי"). Each day shows its status; a day with
// workouts opens them.
export function MonthCalendar({ goals, sessions, today, month, onMonthChange }: MonthCalendarProps) {
  const router = useRouter();
  const [openDate, setOpenDate] = useState<string | null>(null);
  const weeks = useMemo(() => monthGrid(month), [month]);
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarSession[]>();
    for (const session of sessions) map.set(session.date, [...(map.get(session.date) ?? []), session]);
    return map;
  }, [sessions]);
  const completed = useMemo(() => new Set(byDate.keys()), [byDate]);
  const daySessions = openDate ? (byDate.get(openDate) ?? []) : [];

  function openDay(date: string) {
    const list = byDate.get(date) ?? [];
    if (list.length === 1) router.push(`/sessions/${list[0].id}`);
    else if (list.length > 1) setOpenDate(date);
  }

  return (
    <section aria-labelledby="calendar-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 id="calendar-title" className="text-section font-medium">
          {monthTitle(month)}
        </h2>
        <div className="-me-2 flex">
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            aria-label={copy.previous}
            className="flex size-11 items-center justify-center rounded-md text-ink-muted active:bg-blush"
          >
            <ChevronRightIcon aria-hidden="true" className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            aria-label={copy.next}
            className="flex size-11 items-center justify-center rounded-md text-ink-muted active:bg-blush"
          >
            <ChevronLeftIcon aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>

      <table className="w-full table-fixed border-separate border-spacing-y-1">
        <thead>
          <tr>
            {copy.weekdays.map((day) => (
              <th key={day} scope="col" className="pb-1 text-caption font-normal text-ink-muted">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, i) => (
            <tr key={i}>
              {week.map((date, j) => {
                if (!date) return <td key={j} />;
                const hasWorkout = byDate.has(date);
                // Without a goal a day has no status, but a workout still marks it like a trained day.
                const goalStatus = getDayStatus(date, goals, completed, today);
                const status: DayStatus = goalStatus === "no_goal" && hasWorkout ? "trained" : goalStatus;
                const isToday = date === today;
                const label = `${formatDate(date)} · ${copy.status[status]}${status === "rest" && hasWorkout ? ` · ${copy.workoutOnRest}` : ""}`;
                const content = (
                  <span
                    className={cn(
                      "relative flex size-10 items-center justify-center rounded-full text-label tabular-nums",
                      dayClass[status],
                      isToday && "ring-2 ring-rose-deep ring-inset",
                    )}
                  >
                    {parseISO(date).getDate()}
                    {/* A workout on a rest day: the day stays "rest" and shows a small mark. */}
                    {status === "rest" && hasWorkout && (
                      <span aria-hidden="true" className="absolute bottom-1 size-1 rounded-full bg-rose-deep" />
                    )}
                  </span>
                );
                return (
                  <td key={j} className="text-center">
                    {hasWorkout ? (
                      <button
                        type="button"
                        onClick={() => openDay(date)}
                        aria-label={label}
                        aria-current={isToday ? "date" : undefined}
                        className="mx-auto flex size-11 items-center justify-center rounded-full active:opacity-70"
                      >
                        {content}
                      </button>
                    ) : (
                      <span role="img" aria-label={label} className="mx-auto flex size-11 items-center justify-center">
                        {content}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-muted" aria-hidden="true">
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-blush-strong" />
          {copy.legend.trained}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-full ring-1 ring-danger/40 ring-inset" />
          {copy.legend.missed}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-full ring-2 ring-rose-deep ring-inset" />
          {copy.legend.today}
        </li>
      </ul>

      <Sheet
        open={openDate !== null}
        onOpenChange={(open) => !open && setOpenDate(null)}
        title={copy.dayWorkouts}
        description={openDate ? formatDate(openDate) : undefined}
      >
        <ul className="flex flex-col gap-2">
          {daySessions.map((session) => (
            <li key={session.id}>
              <Link
                href={`/sessions/${session.id}`}
                className="flex min-h-14 items-center rounded-md border border-hairline px-4 active:bg-blush/60"
              >
                {session.name ?? strings.workout.freeWorkout}
              </Link>
            </li>
          ))}
        </ul>
      </Sheet>
    </section>
  );
}
