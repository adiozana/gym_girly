import type { PreviousPerformance } from "@/lib/calc";
import type { ExerciseSetsRow, SessionExerciseRow } from "@/lib/validation/workout";
import { formatReps, formatWeight, parseReps, parseWeight, type SetSuggestion } from "./set-input";
import type { ExerciseInfo, WorkoutCard } from "./types";

// Pure transitions of the workout screen's state. The screen applies them and queues
// the matching writes; keeping them here makes the rules testable.

export const DEFAULT_SET_COUNT = 3;
export const MAX_SET_COUNT = 10;

// What the empty fields suggest (SPEC.md "ביצוע קודם"). Weight: the plan's current weight
// when the row is the plan's own exercise, else last time's. Reps: last time's, else the
// bottom of the plan's rep range.
export function suggestionFor(card: WorkoutCard): SetSuggestion {
  const last = card.previous?.sets[0] ?? null;
  const fromPlan = card.replaced === null ? card.plan : null;
  const weight = fromPlan?.target_weight_kg ?? last?.weight_kg ?? null;
  const reps = last?.reps ?? card.plan?.rep_range_min ?? null;
  if (reps == null) return weight == null ? null : { weight_kg: weight, reps: 0 };
  return { weight_kg: weight, reps };
}

// How many sets a new row gets: the plan's, else as many as last time, else 3.
export function defaultSetCount(plan: { planned_sets: number } | null, previous: PreviousPerformance | null): number {
  return plan?.planned_sets ?? (previous?.sets.length || DEFAULT_SET_COUNT);
}

// Grows or shrinks the row to `count` sets (1..10), keeping the existing ids in order.
export function withSetCount(card: WorkoutCard, count: number, newId: () => string): WorkoutCard {
  const target = Math.max(1, Math.min(MAX_SET_COUNT, count));
  const setIds =
    target <= card.setIds.length
      ? card.setIds.slice(0, target)
      : [...card.setIds, ...Array.from({ length: target - card.setIds.length }, newId)];
  return { ...card, setIds };
}

// SPEC.md: swapping is allowed only while the exercise isn't marked done.
export function canSwap(card: WorkoutCard): boolean {
  return !card.done;
}

// The exercise the row started with: the plan's exercise, or the first one chosen.
export function originalExercise(card: WorkoutCard): ExerciseInfo {
  return card.replaced ?? card.exercise;
}

// Swaps the row's exercise. replaced keeps the very first original; choosing the original
// again reverts the swap. Typed values belonged to the old exercise, so they are cleared,
// and the suggestions wait for the new exercise's history.
export function swapExercise(card: WorkoutCard, exercise: ExerciseInfo): WorkoutCard {
  const original = originalExercise(card);
  return {
    ...card,
    exercise,
    replaced: exercise.id === original.id ? null : original,
    previous: null,
    weight: "",
    reps: "",
  };
}

export function withPrevious(card: WorkoutCard, previous: PreviousPerformance | null): WorkoutCard {
  return { ...card, previous };
}

// Marks the whole exercise done with these values (copied from the suggestion when a field
// was left empty), so a repeat of last time is one tap.
export function markDone(card: WorkoutCard, values: { weight_kg: number | null; reps: number }): WorkoutCard {
  return { ...card, done: true, weight: formatWeight(values.weight_kg), reps: formatReps(values.reps) };
}

// Positions follow the on-screen order (1..n).
export function renumberCards(cards: readonly WorkoutCard[]): WorkoutCard[] {
  return cards.map((card, index) => (card.position === index + 1 ? card : { ...card, position: index + 1 }));
}

export function toSetsRow(card: WorkoutCard): ExerciseSetsRow {
  return {
    sessionExerciseId: card.id,
    setIds: card.setIds,
    weight_kg: parseWeight(card.weight),
    reps: parseReps(card.reps),
    is_done: card.done,
  };
}

export function toExerciseRow(card: WorkoutCard): SessionExerciseRow {
  return {
    id: card.id,
    exercise_id: card.exercise.id,
    replaced_exercise_id: card.replaced?.id ?? null,
    template_exercise_id: card.template_exercise_id,
    position: card.position,
    note: card.note,
  };
}

export function countUndoneExercises(cards: readonly WorkoutCard[]): number {
  return cards.filter((card) => !card.done).length;
}

export function countDoneExercises(cards: readonly WorkoutCard[]): number {
  return cards.filter((card) => card.done).length;
}
