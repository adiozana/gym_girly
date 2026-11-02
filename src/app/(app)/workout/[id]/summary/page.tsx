import { ArrowTrendingDownIcon, ArrowTrendingUpIcon, MinusIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { cn } from "cn";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { buttonVariants } from "@/components/ui/button";
import { summarizeWorkout, type ExerciseComparison } from "@/lib/calc";
import { getSummaryData } from "@/lib/history/queries";
import { formatDate } from "@/lib/format-date";
import { strings } from "@/lib/strings";
import { idSchema } from "@/lib/validation/common";
import { formatWeight } from "@/lib/workout/set-input";

const { summary: copy } = strings;

export const metadata: Metadata = { title: copy.titleFor };

const numberFormat = new Intl.NumberFormat("he-IL", { maximumFractionDigits: 1 });

export default function SummaryPage({ params }: PageProps<"/workout/[id]/summary">) {
  return (
    <Suspense fallback={<ListSkeleton rows={4} />}>
      <Summary params={params} />
    </Suspense>
  );
}

async function Summary({ params }: { params: PageProps<"/workout/[id]/summary">["params"] }) {
  const { id } = await params;
  const data = idSchema.safeParse(id).success ? await getSummaryData(id) : null;
  if (!data) {
    return <p className="py-16 text-center text-ink-muted">{copy.notFound}</p>;
  }

  const { log, previous } = data;
  const summary = summarizeWorkout({
    startedAt: log.started_at,
    completedAt: log.completed_at ?? log.started_at,
    exercises: log.exercises.map((e) => ({ exerciseId: e.exercise.id, name: e.exercise.name_he, sets: e.sets })),
    previous,
  });

  return (
    <div className="flex flex-1 flex-col gap-8 pt-6">
      <header className="flex flex-col gap-1">
        <p className="text-label font-medium text-rose-deep">{copy.title}</p>
        <h1 className="text-title font-semibold wrap-break-word">{log.template_name ?? strings.workout.freeWorkout}</h1>
        <p className="text-ink-muted">
          <bdi>{formatDate(log.session_date)}</bdi>
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3">
        <Stat label={copy.duration} value={copy.minutes(summary.durationMinutes)} />
        <Stat label={copy.exercises} value={String(summary.exerciseCount)} />
        <Stat label={copy.sets} value={String(summary.setCount)} />
        <Stat label={copy.volume} value={copy.volumeValue(numberFormat.format(summary.volumeKg))} hint={copy.volumeHint} />
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="text-section font-medium">{copy.comparison}</h2>
        <ul className="flex flex-col gap-2">
          {summary.exercises.map((exercise) => (
            <ComparisonRow key={exercise.exerciseId} exercise={exercise} />
          ))}
        </ul>
      </section>

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <Link href={`/sessions/${log.id}`} className={buttonVariants({ variant: "outline", size: "lg" })}>
          {copy.details}
        </Link>
        <Link href="/" className={buttonVariants({ size: "lg" })}>
          {copy.done}
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-hairline bg-surface p-4" title={hint}>
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="text-section font-semibold tabular-nums">
        <bdi>{value}</bdi>
      </dd>
    </div>
  );
}

function setText(set: { weight_kg: number | null; reps: number } | null) {
  if (!set) return "—";
  return strings.workout.details.setValue(set.weight_kg == null ? null : formatWeight(set.weight_kg), set.reps);
}

function ComparisonRow({ exercise }: { exercise: ExerciseComparison }) {
  const trend = {
    up: { icon: ArrowTrendingUpIcon, label: copy.up, className: "bg-success/10 text-success" },
    down: { icon: ArrowTrendingDownIcon, label: copy.down, className: "bg-danger/10 text-danger" },
    same: { icon: MinusIcon, label: copy.same, className: "bg-blush text-ink-muted" },
    first: { icon: SparklesIcon, label: copy.firstTime, className: "bg-blush text-rose-deep" },
  }[exercise.trend];
  const Icon = trend.icon;
  const change =
    exercise.change != null && exercise.trend !== "first"
      ? copy.change(`${exercise.change > 0 ? "+" : ""}${numberFormat.format(exercise.change)}`)
      : null;

  return (
    <li className="flex items-center gap-3 rounded-md border border-hairline bg-surface p-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-label font-medium wrap-break-word">{exercise.name}</span>
        <span className="text-caption text-ink-muted">
          {copy.today}: <bdi className="text-ink">{setText(exercise.today)}</bdi>
        </span>
        {exercise.trend !== "first" && (
          <span className="text-caption text-ink-muted">
            {copy.lastTime}: <bdi>{setText(exercise.previous)}</bdi>
          </span>
        )}
      </div>
      <span className={cn("flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-caption font-medium", trend.className)}>
        <Icon aria-hidden="true" className="size-4" />
        {change ? <bdi dir="ltr" className="tabular-nums">{change}</bdi> : trend.label}
        {change && <span className="sr-only">{trend.label}</span>}
      </span>
    </li>
  );
}
