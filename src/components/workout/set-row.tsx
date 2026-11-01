"use client";

import { CheckIcon } from "@heroicons/react/24/outline";
import { cn } from "cn";
import { memo } from "react";
import { strings } from "@/lib/strings";
import { formatReps, formatWeight } from "@/lib/workout/set-input";
import type { WorkoutSet } from "@/lib/workout/types";

const { card, errors } = strings.workout;

export type SetError = "reps" | "weight";

type SetRowProps = {
  set: WorkoutSet;
  error: SetError | undefined;
  onWeightChange: (setId: string, text: string) => void;
  onRepsChange: (setId: string, text: string) => void;
  onToggleDone: (setId: string) => void;
};

const fieldClass =
  "h-12 w-full min-w-0 rounded-md border border-hairline bg-surface px-2 text-center text-base font-medium text-ink tabular-nums outline-none transition-colors placeholder:font-normal placeholder:text-ink-muted focus-visible:border-rose-deep focus-visible:ring-2 focus-visible:ring-rose-deep/25 focus-visible:ring-offset-0 aria-invalid:border-danger";

// One set: number, weight, reps and the done toggle. Last time's values (or the set above's,
// for an added set) show as gray placeholders; marking done with an untouched field takes them.
export const SetRow = memo(function SetRow({ set, error, onWeightChange, onRepsChange, onToggleDone }: SetRowProps) {
  const n = set.set_number;
  const errorId = `set-error-${set.id}`;
  const weightPlaceholder = formatWeight(set.suggestion?.weight_kg ?? null);
  // A suggestion with 0 reps carries only a weight.
  const repsPlaceholder = set.suggestion && set.suggestion.reps > 0 ? formatReps(set.suggestion.reps) : "";

  return (
    <li className="flex flex-col gap-1">
      <div
        className={cn(
          "grid grid-cols-[2rem_1fr_1fr_3rem] items-center gap-2 rounded-md transition-colors duration-150",
          set.is_done && "bg-success/10",
        )}
      >
        <span className="text-center text-label font-medium text-ink-muted tabular-nums" aria-hidden="true">
          {n}
        </span>
        <input
          aria-label={card.weightLabel(n)}
          inputMode="decimal"
          dir="ltr"
          autoComplete="off"
          enterKeyHint="next"
          value={set.weight}
          placeholder={weightPlaceholder}
          onChange={(event) => onWeightChange(set.id, event.target.value)}
          aria-invalid={error === "weight" || undefined}
          aria-describedby={error ? errorId : undefined}
          className={fieldClass}
        />
        <input
          aria-label={card.repsLabel(n)}
          inputMode="numeric"
          pattern="[0-9]*"
          dir="ltr"
          autoComplete="off"
          enterKeyHint="done"
          value={set.reps}
          placeholder={repsPlaceholder}
          onChange={(event) => onRepsChange(set.id, event.target.value)}
          aria-invalid={error === "reps" || undefined}
          aria-describedby={error ? errorId : undefined}
          className={fieldClass}
        />
        <button
          type="button"
          aria-pressed={set.is_done}
          aria-label={card.doneLabel(n)}
          aria-describedby={error ? errorId : undefined}
          onClick={() => onToggleDone(set.id)}
          className={cn(
            "flex size-12 items-center justify-center rounded-md border transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-95",
            set.is_done
              ? "border-success bg-success text-white"
              : "border-hairline bg-surface text-ink-subtle active:bg-blush",
          )}
        >
          <CheckIcon aria-hidden="true" className={cn("size-6", set.is_done && "stroke-2")} />
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="ps-10 text-caption text-danger">
          {error === "reps" ? errors.repsRequired : errors.weightRequired}
        </p>
      )}
    </li>
  );
});
