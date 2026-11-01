"use client";

import { ArrowUturnLeftIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { Sheet } from "@/components/shared/sheet";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";
import { formatWeight } from "@/lib/workout/set-input";
import { canSwap, originalExercise } from "@/lib/workout/state";
import type { ExerciseInfo, WorkoutCard } from "@/lib/workout/types";

const { details } = strings.workout;

type ExerciseDetailsSheetProps = {
  card: WorkoutCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwap: (exercise: ExerciseInfo) => void;
  onAddExtra: (exercise: ExerciseInfo) => void;
  // Opens the library: to swap while allowed, otherwise to add an extra card below.
  onChooseOther: () => void;
};

// Exercise details during a workout (SPEC.md "פרטי תרגיל"): instructions, the plan's
// alternatives, and last time's sets. Swapping is possible only while no set is done;
// after that an alternative is added as an extra exercise below.
export function ExerciseDetailsSheet({ card, open, onOpenChange, onSwap, onAddExtra, onChooseOther }: ExerciseDetailsSheetProps) {
  const { exercise, previous } = card;
  const swappable = canSwap(card);
  const original = originalExercise(card);
  const alternatives = card.alternatives.filter((alt) => alt.id !== exercise.id);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={exercise.name_he}
      description={details.meta(strings.muscleGroups[exercise.muscle_group], strings.equipment[exercise.equipment])}
    >
      <div className="flex flex-col gap-7">
        <section className="flex flex-col gap-2">
          <h3 className="text-label font-medium">{details.instructions}</h3>
          <p className={exercise.instructions_he ? "max-w-[65ch]" : "text-ink-muted"}>
            {exercise.instructions_he ?? details.noInstructions}
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-col">
            <h3 className="text-label font-medium">{details.alternatives}</h3>
            {swappable ? (
              alternatives.length > 0 && <p className="text-caption text-ink-muted">{details.alternativesHint}</p>
            ) : (
              <p className="text-caption text-ink-muted">{details.lockedHint}</p>
            )}
          </div>

          {swappable && card.replaced && (
            <Button variant="outline" size="lg" onClick={() => onSwap(original)}>
              <ArrowUturnLeftIcon aria-hidden="true" />
              {details.revert(original.name_he)}
            </Button>
          )}

          {alternatives.length > 0 && (
            <ol className="divide-y divide-hairline rounded-md border border-hairline">
              {alternatives.map((alternative) => (
                <li key={alternative.id} className="flex items-center gap-3 py-2 ps-4 pe-2">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="wrap-break-word">{alternative.name_he}</span>
                    <span className="text-caption text-ink-muted">{strings.equipment[alternative.equipment]}</span>
                  </span>
                  {swappable ? (
                    <Button
                      variant="outline"
                      aria-label={details.swapNamed(alternative.name_he)}
                      onClick={() => onSwap(alternative)}
                    >
                      {details.swap}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      aria-label={details.addAsExtraNamed(alternative.name_he)}
                      onClick={() => onAddExtra(alternative)}
                    >
                      <PlusIcon aria-hidden="true" />
                      {details.addAsExtra}
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          )}

          <Button variant="link" className="self-start px-0" onClick={onChooseOther}>
            {swappable ? <MagnifyingGlassIcon aria-hidden="true" /> : <PlusIcon aria-hidden="true" />}
            {swappable ? details.chooseOther : details.addAlternativeAsExtra}
          </Button>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-label font-medium">
            {details.history}
            {previous && (
              <>
                {" · "}
                <bdi className="font-normal text-ink-muted tabular-nums">
                  {format(new Date(previous.startedAt), "dd/MM/yyyy")}
                </bdi>
              </>
            )}
          </h3>
          {previous ? (
            <ol className="flex flex-col gap-1">
              {previous.sets.map((set) => (
                <li key={set.set_number} className="flex items-center justify-between gap-3 text-ink">
                  <span className="text-ink-muted">{details.setNumber(set.set_number)}</span>
                  <span className="tabular-nums">
                    {details.setValue(set.weight_kg == null ? null : formatWeight(set.weight_kg), set.reps)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-ink-muted">{details.historyEmpty}</p>
          )}
        </section>
      </div>
    </Sheet>
  );
}
