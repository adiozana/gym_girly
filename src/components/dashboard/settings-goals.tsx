"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { GoalData } from "@/lib/dashboard/queries";
import { activeGoal } from "@/lib/dashboard/today";
import { formatDate } from "@/lib/format-date";
import { strings } from "@/lib/strings";
import { useToday } from "@/lib/use-today";
import { ChallengeCard } from "./challenge-card";
import { GoalSheet } from "./goal-sheet";

const { goal: goalCopy, challenge: challengeCopy } = strings.dashboard;

// Settings (SPEC.md "הגדרות"): the goal, the challenge and past challenges.
export function SettingsGoals({ data, plans }: { data: GoalData; plans: { id: string; name: string }[] }) {
  const today = useToday();
  const [editing, setEditing] = useState(false);
  const completed = useMemo(() => new Set(data.completedDates), [data.completedDates]);
  if (!today) return <Skeleton className="h-64 w-full" />;

  const goal = activeGoal(data.goals);
  const active = data.challenges.find((c) => c.status === "active") ?? null;
  const past = data.challenges.filter((c) => c.status !== "active");
  const summary = !goal
    ? goalCopy.title
    : goal.type === "fixed_days"
      ? goalCopy.summaryFixed(goal.training_weekdays.map((d) => goalCopy.weekdayNames[d]).join(", "))
      : goalCopy.summaryCycle(goal.cycle_on, goal.cycle_off);

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="goal-title" className="flex flex-col gap-2 rounded-md border border-hairline bg-surface p-4">
        <h2 id="goal-title" className="text-caption text-ink-muted">
          {goalCopy.title}
        </h2>
        <p className="font-medium">{goal ? summary : strings.dashboard.today.noGoalTitle}</p>
        <Button variant="outline" className="self-start" onClick={() => setEditing(true)}>
          {goal ? strings.dashboard.today.editGoal : strings.dashboard.today.setGoal}
        </Button>
      </section>

      <ChallengeCard active={active} justEnded={null} hasGoal={goal !== null} goals={data.goals} completedDates={completed} today={today} />

      {past.length > 0 && (
        <section aria-labelledby="past-challenges" className="flex flex-col gap-2">
          <h2 id="past-challenges" className="text-label font-medium">
            {challengeCopy.history}
          </h2>
          <ul className="divide-y divide-hairline rounded-md border border-hairline bg-surface">
            {past.map((challenge) => (
              <li key={challenge.id} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
                <bdi className="text-label">
                  {challengeCopy.historyLine(challengeCopy.weeksValue(challenge.weeks), formatDate(challenge.start_date))}
                </bdi>
                <span
                  className={
                    challenge.status === "succeeded"
                      ? "rounded-md bg-success/10 px-2 py-0.5 text-caption font-medium text-success"
                      : "rounded-md bg-blush px-2 py-0.5 text-caption text-ink-muted"
                  }
                >
                  {challenge.status === "succeeded" ? challengeCopy.statusSucceeded : challengeCopy.statusFailed}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <GoalSheet open={editing} onOpenChange={setEditing} current={goal} plans={plans} today={today} />
    </div>
  );
}
