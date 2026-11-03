"use client";

import { FlagIcon, FireIcon } from "@heroicons/react/24/outline";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { currentStreak, evaluateChallenge, getDayStatus, longestStreak } from "@/lib/calc";
import { settleChallenge } from "@/lib/dashboard/actions";
import { monthOf, type MonthKey } from "@/lib/dashboard/calendar";
import type { ChallengeRow, GoalData } from "@/lib/dashboard/queries";
import { activeGoal, plannedTemplateFor } from "@/lib/dashboard/today";
import { strings } from "@/lib/strings";
import type { ProgressPlan } from "@/lib/progress/queries";
import { useToday } from "@/lib/use-today";
import { ProgressSection } from "@/components/progress/progress-section";
import { ChallengeCard } from "./challenge-card";
import { GoalSheet } from "./goal-sheet";
import { MonthCalendar } from "./month-calendar";

const { dashboard: copy } = strings;

type DashboardProps = {
  data: GoalData;
  plans: { id: string; name: string }[];
  progress: ProgressPlan[];
};

// Home below the start button (SPEC.md order): today and the streak, the month, the challenge,
// and the progress chart.
// Everything here depends on the device's "today", so it renders on the client.
export function Dashboard(props: DashboardProps) {
  const today = useToday();
  if (!today) return <DashboardSkeleton />;
  return <DashboardForDay {...props} today={today} />;
}

function DashboardForDay({ data, plans, progress, today }: DashboardProps & { today: string }) {
  const [month, setMonth] = useState<MonthKey>(() => monthOf(today));
  const [editingGoal, setEditingGoal] = useState(false);
  const [justEnded, setJustEnded] = useState<ChallengeRow | null>(null);
  const settling = useRef(false);

  const completed = useMemo(() => new Set(data.completedDates), [data.completedDates]);
  const goal = activeGoal(data.goals);
  const status = getDayStatus(today, data.goals, completed, today);
  const plan = plannedTemplateFor(data.goals, today);
  const streak = currentStreak(data.goals, completed, today);
  const longest = longestStreak(data.goals, completed, today);
  const active = data.challenges.find((c) => c.status === "active") ?? null;

  // SPEC.md: when the active challenge has ended, its result is recorded as the dashboard loads.
  const ended = active ? evaluateChallenge(active, data.goals, completed, today).status !== "active" : false;
  useEffect(() => {
    if (!active || !ended || settling.current) return;
    settling.current = true;
    void settleChallenge(active.id, today).then((result) => {
      if (result.ok && result.data.status !== "active") {
        setJustEnded({ ...active, status: result.data.status as ChallengeRow["status"] });
      }
    });
  }, [active, ended, today]);

  const todayLine =
    status === "trained"
      ? copy.today.done
      : status === "rest"
        ? copy.today.rest
        : status === "pending"
          ? plan
            ? `${copy.today.training} · ${plan.name}`
            : copy.today.training
          : null;

  return (
    <div className="flex flex-col gap-8">
      {goal ? (
        <section aria-labelledby="today-title" className="flex items-stretch gap-3">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 rounded-md bg-blush p-4">
            <h2 id="today-title" className="text-caption text-ink-muted">
              {copy.today.label}
            </h2>
            <p className="font-medium wrap-break-word">{todayLine}</p>
            <Button variant="link" className="-ms-0.5 h-auto self-start px-0 py-1 text-caption" onClick={() => setEditingGoal(true)}>
              {copy.today.editGoal}
            </Button>
          </div>
          <div className="flex w-32 shrink-0 flex-col justify-center gap-0.5 rounded-md border border-hairline bg-surface p-4" title={copy.streak.hint}>
            <p className="flex items-center gap-1 text-caption text-ink-muted">
              <FireIcon aria-hidden="true" className="size-4 text-rose-deep" />
              {copy.streak.label}
            </p>
            <p className="text-title font-semibold text-rose-deep tabular-nums">{streak}</p>
            <p className="text-caption text-ink-muted">{copy.streak.longest(copy.streak.days(longest))}</p>
          </div>
        </section>
      ) : (
        <section className="flex items-center gap-4 rounded-md bg-blush p-4">
          <FlagIcon aria-hidden="true" className="size-8 shrink-0 stroke-[1.25] text-rose-deep" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="font-medium">{copy.today.noGoalTitle}</p>
            <p className="text-caption text-ink-muted">{copy.today.noGoalBody}</p>
          </div>
          <Button variant="outline" onClick={() => setEditingGoal(true)}>
            {copy.today.setGoal}
          </Button>
        </section>
      )}

      <MonthCalendar goals={data.goals} sessions={data.sessions} today={today} month={month} onMonthChange={setMonth} />

      <ChallengeCard
        active={justEnded ? null : active}
        justEnded={justEnded}
        hasGoal={goal !== null}
        goals={data.goals}
        completedDates={completed}
        today={today}
      />

      <ProgressSection plans={progress} today={today} />

      <GoalSheet open={editingGoal} onOpenChange={setEditingGoal} current={goal} plans={plans} today={today} />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
