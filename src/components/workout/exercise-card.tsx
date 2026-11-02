"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ArrowsRightLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { cn } from "cn";
import { memo } from "react";
import { PlannedSets } from "@/components/plans/planned-sets";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";
import { formatReps, formatWeight } from "@/lib/workout/set-input";
import { canSwap, MAX_SET_COUNT, originalExercise, suggestionFor } from "@/lib/workout/state";
import type { ExerciseInfo, WorkoutCard } from "@/lib/workout/types";

const { card: copy, details } = strings.workout;

export type CardError = "reps" | "weight";

// Stable handlers from the screen; every one names the row it acts on.
export type CardActions = {
  toggleExpanded: (cardId: string) => void;
  changeWeight: (cardId: string, text: string) => void;
  changeReps: (cardId: string, text: string) => void;
  toggleDone: (cardId: string) => void;
  changeSetCount: (cardId: string, delta: -1 | 1) => void;
  changeNote: (cardId: string, text: string) => void;
  swap: (cardId: string, exercise: ExerciseInfo) => void;
  addExtra: (cardId: string, exercise: ExerciseInfo) => void;
  chooseOther: (cardId: string) => void;
  move: (cardId: string, delta: -1 | 1) => void;
  remove: (cardId: string) => void;
};

type ExerciseCardProps = {
  card: WorkoutCard;
  expanded: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  error: CardError | undefined;
  actions: CardActions;
};

const fieldClass =
  "h-11 w-full rounded-md border border-hairline bg-surface px-1 text-center text-base font-medium text-ink tabular-nums outline-none placeholder:font-normal placeholder:text-ink-muted focus-visible:border-rose-deep focus-visible:ring-2 focus-visible:ring-rose-deep/25 focus-visible:ring-offset-0 aria-invalid:border-danger";

const dateFormat = new Intl.DateTimeFormat("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });

// One exercise in the workout (SPEC.md): name and plan, ONE weight and reps, and one tap marks
// all its sets done. Tapping the name opens an accordion with instructions, the 2 alternatives,
// last time, the set count, a note and row actions.
export const ExerciseCard = memo(function ExerciseCard({
  card,
  expanded,
  canMoveUp,
  canMoveDown,
  error,
  actions,
}: ExerciseCardProps) {
  const name = card.exercise.name_he;
  const panelId = `panel-${card.id}`;
  const suggestion = suggestionFor(card);
  const swappable = canSwap(card);
  const original = originalExercise(card);
  const last = card.previous?.sets[0];

  return (
    <article
      id={`card-${card.id}`}
      className={cn(
        "scroll-mt-24 rounded-md border bg-surface transition-colors duration-150",
        card.done ? "border-success/30 bg-success/5" : "border-hairline",
      )}
    >
      {/* One line: name (wraps, centered against the fields), weight, reps, done. */}
      <div className="flex items-center gap-2 py-2 ps-3 pe-2">
        <button
          type="button"
          onClick={() => actions.toggleExpanded(card.id)}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-1 text-start"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-label font-medium wrap-break-word">{name}</span>
            <span className="text-caption text-ink-muted">
              {card.replaced && <>{copy.replacedFor(card.replaced.name_he)} · </>}
              <PlannedSets
                sets={card.setIds.length}
                repMin={card.plan?.rep_range_min ?? null}
                repMax={card.plan?.rep_range_max ?? null}
              />
            </span>
          </span>
          <ChevronDownIcon
            aria-hidden="true"
            className={cn("size-4 shrink-0 text-ink-muted transition-transform duration-200", expanded && "rotate-180")}
          />
        </button>

        <label className="flex w-14 shrink-0 flex-col items-center gap-0.5">
          <span className="text-caption text-ink-muted">{copy.columns.weight}</span>
          <input
            inputMode="decimal"
            dir="ltr"
            value={card.weight}
            placeholder={suggestion?.weight_kg != null ? formatWeight(suggestion.weight_kg) : undefined}
            onChange={(event) => actions.changeWeight(card.id, event.target.value)}
            aria-label={copy.weightLabel(name)}
            aria-invalid={error === "weight"}
            className={fieldClass}
          />
        </label>
        <label className="flex w-12 shrink-0 flex-col items-center gap-0.5">
          <span className="text-caption text-ink-muted">{copy.columns.reps}</span>
          <input
            inputMode="numeric"
            dir="ltr"
            value={card.reps}
            placeholder={suggestion && suggestion.reps > 0 ? formatReps(suggestion.reps) : undefined}
            onChange={(event) => actions.changeReps(card.id, event.target.value)}
            aria-label={copy.repsLabel(name)}
            aria-invalid={error === "reps"}
            className={fieldClass}
          />
        </label>
        <button
          type="button"
          onClick={() => actions.toggleDone(card.id)}
          aria-pressed={card.done}
          aria-label={copy.doneLabel(name)}
          className={cn(
            "mt-[18px] flex size-11 shrink-0 items-center justify-center rounded-md border transition-[background-color,color,transform] duration-150 active:scale-95",
            card.done ? "border-success bg-success text-white" : "border-hairline bg-surface text-ink-subtle",
          )}
        >
          <CheckIcon aria-hidden="true" className="size-5" />
        </button>
      </div>
      {error && (
        <p role="alert" className="px-3 pb-2 text-caption text-danger">
          {error === "reps" ? strings.workout.errors.repsRequired : strings.workout.errors.weightRequired}
        </p>
      )}

      {/* Accordion: grid rows animate the height without measuring it. */}
      <div
        id={panelId}
        role="region"
        aria-label={copy.details(name)}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        inert={!expanded}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-5 border-t border-hairline px-4 pt-4 pb-4">
            <p className="max-w-[65ch] text-label text-ink-muted">{card.exercise.instructions_he ?? details.noInstructions}</p>

            <section className="flex flex-col gap-2">
              <h3 className="text-label font-medium">{details.alternatives}</h3>
              {card.alternatives.length === 0 ? (
                <p className="text-label text-ink-muted">{copy.noAlternatives}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {card.alternatives
                    .filter((alternative) => alternative.id !== card.exercise.id)
                    .map((alternative) => (
                      <li key={alternative.id} className="flex items-center gap-2">
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="wrap-break-word">{alternative.name_he}</span>
                          <span className="text-caption text-ink-muted">{strings.equipment[alternative.equipment]}</span>
                        </span>
                        {swappable ? (
                          <Button variant="outline" onClick={() => actions.swap(card.id, alternative)} aria-label={details.swapNamed(alternative.name_he)}>
                            <ArrowsRightLeftIcon aria-hidden="true" />
                            {details.swap}
                          </Button>
                        ) : (
                          <Button variant="outline" onClick={() => actions.addExtra(card.id, alternative)} aria-label={details.addAsExtraNamed(alternative.name_he)}>
                            <PlusIcon aria-hidden="true" />
                            {details.addAsExtra}
                          </Button>
                        )}
                      </li>
                    ))}
                </ul>
              )}
              {!swappable && <p className="text-caption text-ink-muted">{details.lockedHint}</p>}
              <div className="flex flex-wrap gap-x-4">
                {card.replaced && swappable && (
                  <Button variant="link" className="px-0" onClick={() => actions.swap(card.id, original)}>
                    {details.revert(original.name_he)}
                  </Button>
                )}
                <Button variant="link" className="px-0" onClick={() => actions.chooseOther(card.id)}>
                  <MagnifyingGlassIcon aria-hidden="true" />
                  {swappable ? details.chooseOther : details.addAlternativeAsExtra}
                </Button>
              </div>
            </section>

            <section className="flex flex-col gap-1">
              <h3 className="text-label font-medium">{details.history}</h3>
              {card.previous && last ? (
                <p className="text-label text-ink-muted">
                  <bdi>{details.setValue(last.weight_kg == null ? null : formatWeight(last.weight_kg), last.reps)}</bdi>
                  {" · "}
                  {strings.plans.editor.setsOnly(card.previous.sets.length)}
                  {" · "}
                  <bdi>{dateFormat.format(new Date(card.previous.startedAt))}</bdi>
                </p>
              ) : (
                <p className="text-label text-ink-muted">{details.historyEmpty}</p>
              )}
              {card.previous?.note && (
                <p className="text-label text-ink-muted">
                  {copy.previousNote} {card.previous.note}
                </p>
              )}
            </section>

            <div className="flex items-center justify-between gap-4">
              <span id={`sets-${card.id}`} className="text-label font-medium">
                {copy.sets}
              </span>
              <div role="group" aria-labelledby={`sets-${card.id}`} className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={copy.decreaseSets}
                  disabled={card.setIds.length <= 1}
                  onClick={() => actions.changeSetCount(card.id, -1)}
                >
                  <MinusIcon aria-hidden="true" />
                </Button>
                <output aria-live="polite" className="w-10 text-center text-section font-medium tabular-nums">
                  {card.setIds.length}
                </output>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={copy.increaseSets}
                  disabled={card.setIds.length >= MAX_SET_COUNT}
                  onClick={() => actions.changeSetCount(card.id, 1)}
                >
                  <PlusIcon aria-hidden="true" />
                </Button>
              </div>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-label font-medium">{copy.note}</span>
              <textarea
                value={card.note}
                onChange={(event) => actions.changeNote(card.id, event.target.value)}
                placeholder={copy.notePlaceholder}
                maxLength={300}
                rows={2}
                dir="auto"
                className="w-full rounded-md border border-hairline bg-surface px-4 py-3 text-base outline-none placeholder:text-ink-subtle focus-visible:border-rose-deep focus-visible:ring-2 focus-visible:ring-rose-deep/25 focus-visible:ring-offset-0"
              />
            </label>

            <div className="flex flex-wrap gap-x-2 border-t border-hairline pt-2">
              <Button variant="ghost" onClick={() => actions.move(card.id, -1)} disabled={!canMoveUp}>
                <ArrowUpIcon aria-hidden="true" />
                {copy.moveUp}
              </Button>
              <Button variant="ghost" onClick={() => actions.move(card.id, 1)} disabled={!canMoveDown}>
                <ArrowDownIcon aria-hidden="true" />
                {copy.moveDown}
              </Button>
              <Button variant="ghost" className="text-danger" onClick={() => actions.remove(card.id)}>
                <TrashIcon aria-hidden="true" />
                {copy.remove}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});
