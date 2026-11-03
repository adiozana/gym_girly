"use client";

import { MinusIcon, PlusIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Sheet } from "@/components/shared/sheet";
import { Button } from "@/components/ui/button";
import { evaluateChallenge, type Goal } from "@/lib/calc";
import { cancelChallenge, startChallenge } from "@/lib/dashboard/actions";
import type { ChallengeRow } from "@/lib/dashboard/queries";
import { formatDate } from "@/lib/format-date";
import { strings } from "@/lib/strings";

const { challenge: copy } = strings.dashboard;

type ChallengeCardProps = {
  active: ChallengeRow | null;
  // The challenge that just ended (shown once with its result), if any.
  justEnded: ChallengeRow | null;
  hasGoal: boolean;
  goals: readonly Goal[];
  completedDates: ReadonlySet<string>;
  today: string;
};

// The active challenge (SPEC.md "אתגר"): progress, weeks done, end date; or a way to start one.
export function ChallengeCard({ active, justEnded, hasGoal, goals, completedDates, today }: ChallengeCardProps) {
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [pending, startTransition] = useTransition();

  const newButton = (
    <Button variant="outline" onClick={() => setCreating(true)} disabled={!hasGoal}>
      {copy.new}
    </Button>
  );

  let body;
  if (active) {
    const result = evaluateChallenge(active, goals, completedDates, today);
    const percent = Math.round((result.daysElapsed / result.totalDays) * 100);
    body = (
      <>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-section font-semibold tabular-nums">{copy.progress(result.weeksCompleted, active.weeks)}</p>
          <p className="text-caption text-ink-muted">
            <bdi>{copy.endsOn(formatDate(result.endDate))}</bdi>
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={result.totalDays}
          aria-valuenow={result.daysElapsed}
          aria-label={copy.dayOf(result.daysElapsed, result.totalDays)}
          className="h-2 overflow-hidden rounded-full bg-blush"
        >
          {/* Fills from the start side (right in RTL). */}
          <div className="h-full rounded-full bg-rose-deep transition-[width] duration-300" style={{ width: `${percent}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-caption text-ink-muted">{copy.dayOf(result.daysElapsed, result.totalDays)}</p>
          <Button variant="link" className="px-0 text-ink-muted" onClick={() => setCancelling(true)}>
            {copy.cancel}
          </Button>
        </div>
      </>
    );
  } else {
    body = (
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <p className="font-medium">
            {justEnded ? (justEnded.status === "succeeded" ? copy.succeeded : copy.failed) : copy.noneTitle}
          </p>
          <p className="text-caption text-ink-muted">{hasGoal ? copy.noneBody : copy.needsGoal}</p>
        </div>
        {newButton}
      </div>
    );
  }

  return (
    <section aria-labelledby="challenge-title" className="flex flex-col gap-3 rounded-md border border-hairline bg-surface p-4">
      <h2 id="challenge-title" className="flex items-center gap-2 text-label font-medium text-rose-deep">
        <TrophyIcon aria-hidden="true" className="size-5" />
        {copy.title}
      </h2>
      {body}

      <ChallengeSheet open={creating} onOpenChange={setCreating} today={today} />
      {active && (
        <ConfirmDialog
          open={cancelling}
          onOpenChange={setCancelling}
          title={copy.cancelTitle}
          description={copy.cancelBody}
          confirmLabel={copy.cancel}
          confirmVariant="danger"
          cancelLabel={strings.common.back}
          pending={pending}
          onConfirm={() =>
            startTransition(async () => {
              const result = await cancelChallenge(active.id, today);
              if (!result.ok) return void toast.error(result.error);
              setCancelling(false);
              toast.success(copy.cancelled);
            })
          }
        />
      )}
    </section>
  );
}

function ChallengeSheet({ open, onOpenChange, today }: { open: boolean; onOpenChange: (open: boolean) => void; today: string }) {
  const [weeks, setWeeks] = useState(4);
  const [pending, startTransition] = useTransition();

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={copy.new}
      description={copy.weeksHint}
      footer={
        <Button
          size="lg"
          className="w-full"
          disabled={pending}
          aria-busy={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await startChallenge(weeks, today);
              if (!result.ok) return void toast.error(result.error);
              onOpenChange(false);
              toast.success(copy.started);
            })
          }
        >
          {copy.start}
        </Button>
      }
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-label font-medium">{copy.weeksLabel}</span>
        <div role="group" aria-label={copy.weeksLabel} className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label={strings.dashboard.goal.decrease(copy.weeksLabel)} disabled={weeks <= 1} onClick={() => setWeeks(weeks - 1)}>
            <MinusIcon aria-hidden="true" />
          </Button>
          <output aria-live="polite" className="w-20 text-center font-medium tabular-nums">
            {copy.weeksValue(weeks)}
          </output>
          <Button variant="outline" size="icon" aria-label={strings.dashboard.goal.increase(copy.weeksLabel)} disabled={weeks >= 52} onClick={() => setWeeks(weeks + 1)}>
            <PlusIcon aria-hidden="true" />
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
