"use client";

import { ArrowPathIcon, BoltIcon, ChevronRightIcon, ClipboardDocumentListIcon, PlayIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/shared/empty-state";
import { Sheet } from "@/components/shared/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import type { TemplateSummary } from "@/lib/plans/types";
import { strings } from "@/lib/strings";
import { useOnHidden } from "@/lib/use-on-hidden";
import { startSession } from "@/lib/workout/actions";

const { workout } = strings;

type StartWorkoutProps = {
  plans: TemplateSummary[];
  // The plan scheduled for today (stage 5): pinned first and marked.
  suggestedTemplateId?: string | null;
};

// "Start workout": a sheet to choose a plan or a free workout (SPEC.md "בחירת אימון").
export function StartWorkout({ plans, suggestedTemplateId }: StartWorkoutProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Which row is starting ("free" for a free workout); stays set until the page is left.
  const [starting, setStarting] = useState<string | null>(null);
  useOnHidden(() => setStarting(null));

  const suggested = plans.find((plan) => plan.id === suggestedTemplateId);
  const ordered = suggested ? [suggested, ...plans.filter((plan) => plan !== suggested)] : plans;

  async function start(templateId: string | null) {
    if (starting) return;
    setStarting(templateId ?? "free");
    // The device's local date (SPEC.md: session_date follows the browser's time zone).
    const result = await startSession(templateId, format(new Date(), "yyyy-MM-dd"));
    if (!result.ok) {
      setStarting(null);
      toast.error(result.error);
      return;
    }
    if (result.data.alreadyOpen) toast(workout.start.alreadyOpen);
    router.push(`/workout/${result.data.id}`);
  }

  const freeWorkoutButton = (
    <StartRow
      title={workout.freeWorkout}
      subtitle={workout.start.freeWorkoutHint}
      icon={BoltIcon}
      busy={starting === "free"}
      disabled={starting !== null}
      onClick={() => void start(null)}
    />
  );

  return (
    <>
      <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
        <PlayIcon aria-hidden="true" />
        {workout.start.button}
      </Button>

      <Sheet open={open} onOpenChange={setOpen} title={workout.start.sheetTitle}>
        {plans.length === 0 ? (
          <EmptyState
            icon={ClipboardDocumentListIcon}
            title={workout.start.noPlansTitle}
            body={workout.start.noPlansBody}
            action={
              <div className="flex flex-col gap-3">
                <Button size="lg" onClick={() => void start(null)} disabled={starting !== null} aria-busy={starting === "free"}>
                  {starting === "free" && <ArrowPathIcon aria-hidden="true" className="animate-spin" />}
                  {workout.freeWorkout}
                </Button>
                <Link href="/plans" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  {workout.start.newPlan}
                </Link>
              </div>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-2">
              {ordered.map((plan) => (
                <li key={plan.id}>
                  <StartRow
                    title={plan.name}
                    subtitle={
                      plan.exercise_count === 0 ? strings.plans.noExercises : strings.plans.exerciseCount(plan.exercise_count)
                    }
                    badge={plan.id === suggested?.id ? workout.start.today : undefined}
                    busy={starting === plan.id}
                    disabled={starting !== null}
                    onClick={() => void start(plan.id)}
                  />
                </li>
              ))}
            </ul>
            <div className="border-t border-hairline pt-4">{freeWorkoutButton}</div>
          </div>
        )}
      </Sheet>
    </>
  );
}

type StartRowProps = {
  title: string;
  subtitle: string;
  icon?: typeof BoltIcon;
  badge?: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
};

function StartRow({ title, subtitle, icon: Icon, badge, busy, disabled, onClick }: StartRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      className="flex min-h-16 w-full items-center gap-3 rounded-md border border-hairline bg-surface px-4 py-3 text-start transition-[background-color,transform] duration-150 active:scale-[0.99] active:bg-blush/60 disabled:opacity-60"
    >
      {Icon && <Icon aria-hidden="true" className="size-5 shrink-0 text-rose-deep" />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-medium wrap-break-word">{title}</span>
          {badge && (
            <span className="rounded-md bg-blush px-2 py-0.5 text-caption font-medium text-rose-deep">{badge}</span>
          )}
        </span>
        <span className="text-caption text-ink-muted">{subtitle}</span>
      </span>
      {busy ? (
        <ArrowPathIcon aria-hidden="true" className="size-5 shrink-0 animate-spin text-ink-muted" />
      ) : (
        <ChevronRightIcon aria-hidden="true" className="size-5 shrink-0 text-ink-subtle rtl:-scale-x-100" />
      )}
    </button>
  );
}
