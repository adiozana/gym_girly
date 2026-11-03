"use client";

import { ArrowTrendingDownIcon, ArrowTrendingUpIcon, ChartBarIcon, MinusIcon } from "@heroicons/react/24/outline";
import { cn } from "cn";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Chip } from "@/components/shared/chip";
import { Skeleton } from "@/components/ui/skeleton";
import { computeProgress, rangeStart, type ProgressRange } from "@/lib/calc";
import { formatDate } from "@/lib/format-date";
import type { ProgressPlan } from "@/lib/progress/queries";
import { strings } from "@/lib/strings";
import { formatWeight } from "@/lib/workout/set-input";

const { progress: copy } = strings.dashboard;
const RANGES: ProgressRange[] = ["month", "3months", "all"];

const ProgressChart = dynamic(() => import("./progress-chart"), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full" />,
});

const numberFormat = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 });
const signed = (value: number) => `${value > 0 ? "+" : ""}${numberFormat.format(value)}`;

function setText(set: { weight_kg: number | null; reps: number }) {
  return strings.workout.details.setValue(set.weight_kg == null ? null : formatWeight(set.weight_kg), set.reps);
}

// Progress per plan (SPEC.md "גרף התקדמות"): plan tabs, a range, the headline %, the chart and
// the exercises behind it. Only percentages are shown, never the term e1RM.
export function ProgressSection({ plans, today }: { plans: ProgressPlan[]; today: string }) {
  // Plans come most-recently-trained first, so the first one is the default tab.
  const [planId, setPlanId] = useState(plans[0]?.id ?? null);
  const [range, setRange] = useState<ProgressRange>("3months");
  const plan = plans.find((p) => p.id === planId) ?? plans[0];

  const result = useMemo(() => {
    if (!plan) return null;
    const from = rangeStart(range, today);
    return computeProgress(from ? plan.sessions.filter((s) => s.date >= from) : plan.sessions);
  }, [plan, range, today]);

  return (
    <section aria-labelledby="progress-title" className="flex flex-col gap-4">
      <h2 id="progress-title" className="text-section font-medium">
        {copy.title}
      </h2>

      {!plan || !result ? (
        <div className="flex items-center gap-3 rounded-md bg-blush p-4 text-ink-muted">
          <ChartBarIcon aria-hidden="true" className="size-6 shrink-0 stroke-[1.25] text-rose-deep" />
          <p>{copy.noPlans}</p>
        </div>
      ) : (
        <>
          <div role="tablist" aria-label={copy.plansLabel} className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
            {plans.map((p) => (
              <Chip key={p.id} role="tab" aria-selected={p.id === plan.id} selected={p.id === plan.id} onClick={() => setPlanId(p.id)}>
                {p.name}
              </Chip>
            ))}
          </div>

          <div role="radiogroup" aria-label={copy.rangeLabel} className="grid grid-cols-3 gap-1 rounded-md bg-blush p-1">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={range === r}
                onClick={() => setRange(r)}
                className={cn(
                  "min-h-11 rounded-md text-label font-medium transition-colors",
                  range === r ? "bg-surface text-ink shadow-soft" : "text-ink-muted",
                )}
              >
                {copy.ranges[r]}
              </button>
            ))}
          </div>

          {!result.enoughData ? (
            <p className="rounded-md border border-hairline bg-surface p-4 text-ink-muted">{copy.needMore}</p>
          ) : (
            <div className="flex flex-col gap-3 rounded-md border border-hairline bg-surface p-4">
              <p className="flex flex-wrap items-baseline gap-x-2" title={copy.headlineHint}>
                <bdi dir="ltr" className="text-display font-semibold text-rose-deep tabular-nums">
                  {signed(result.headline ?? 0)}%
                </bdi>
                <span className="text-label text-ink-muted">
                  <bdi>{copy.since(formatDate(result.sinceDate ?? today))}</bdi>
                </span>
              </p>
              <ProgressChart points={result.points} label={copy.chartLabel(plan.name)} />
            </div>
          )}

          {result.exercises.length > 0 && (
            <ul className="flex flex-col divide-y divide-hairline rounded-md border border-hairline bg-surface" aria-label={copy.exercisesTitle}>
              {result.exercises.map((row) => {
                const Icon = row.change == null ? null : row.change > 0 ? ArrowTrendingUpIcon : row.change < 0 ? ArrowTrendingDownIcon : MinusIcon;
                return (
                  <li key={row.exerciseId} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-label font-medium wrap-break-word">{row.name}</span>
                      <span className="text-caption text-ink-muted">
                        {copy.start}: <bdi>{setText(row.first)}</bdi>
                        {row.last && (
                          <>
                            {" · "}
                            {copy.latest}: <bdi>{setText(row.last)}</bdi>
                          </>
                        )}
                      </span>
                    </div>
                    {row.firstTime || row.change == null ? (
                      <span className="shrink-0 rounded-md bg-blush px-2 py-1 text-caption text-rose-deep">{copy.firstTime}</span>
                    ) : (
                      <span
                        className={cn(
                          "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-caption font-medium",
                          row.change > 0 ? "bg-success/10 text-success" : row.change < 0 ? "bg-danger/10 text-danger" : "bg-blush text-ink-muted",
                        )}
                      >
                        {Icon && <Icon aria-hidden="true" className="size-4" />}
                        <bdi dir="ltr" className="tabular-nums">
                          {signed(row.change)}%
                        </bdi>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
