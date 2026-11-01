import { suggestionForSet, type PreviousPerformance } from "@/lib/calc";
import type { SessionExerciseRow, SessionSetRow } from "@/lib/validation/workout";
import { formatReps, formatWeight, parseReps, parseWeight, type SetSuggestion } from "./set-input";
import type { ExerciseInfo, WorkoutCard, WorkoutSet } from "./types";

// Pure transitions of the workout screen's state. The screen applies them and queues
// the matching writes; keeping them here makes the rules testable.

export const DEFAULT_SET_COUNT = 3;

export function emptySet(id: string, setNumber: number, suggestion: SetSuggestion): WorkoutSet {
  return { id, set_number: setNumber, weight: "", reps: "", is_done: false, suggestion };
}

// SPEC.md: "add set" copies the values of the set above as a suggestion: what was entered,
// or else what was suggested for it.
export function suggestionFromSetAbove(above: WorkoutSet | undefined): SetSuggestion {
  if (!above) return null;
  const reps = parseReps(above.reps) ?? above.suggestion?.reps ?? null;
  const weight = above.weight.trim() === "" ? (above.suggestion?.weight_kg ?? null) : parseWeight(above.weight);
  if (reps == null) return weight == null ? null : { weight_kg: weight, reps: 0 };
  return { weight_kg: weight, reps };
}

export function addSet(card: WorkoutCard, id: string): WorkoutCard {
  const last = card.sets.at(-1);
  const setNumber = (last?.set_number ?? 0) + 1;
  // With no set above (an empty card), last time's matching set is the best guess.
  const suggestion = last ? suggestionFromSetAbove(last) : suggestionForSet(card.previous, setNumber);
  return { ...card, sets: [...card.sets, emptySet(id, setNumber, suggestion)] };
}

// New sets for a card added during the workout: as many as last time, else 3.
export function setsFromPrevious(previous: PreviousPerformance | null, newId: () => string): WorkoutSet[] {
  const count = previous?.sets.length || DEFAULT_SET_COUNT;
  return Array.from({ length: count }, (_, i) => emptySet(newId(), i + 1, suggestionForSet(previous, i + 1)));
}

export function hasDoneSet(card: WorkoutCard): boolean {
  return card.sets.some((set) => set.is_done);
}

// SPEC.md: swapping is allowed only while no set in the card is done.
export function canSwap(card: WorkoutCard): boolean {
  return !hasDoneSet(card);
}

// The exercise the card started with: the template's exercise, or the first one chosen.
export function originalExercise(card: WorkoutCard): ExerciseInfo {
  return card.replaced ?? card.exercise;
}

// Swaps the card's exercise. replaced keeps the very first original; choosing the original
// again reverts the swap. The typed values belonged to the old exercise, so they are cleared,
// and the suggestions wait for the new exercise's history.
export function swapExercise(card: WorkoutCard, exercise: ExerciseInfo): WorkoutCard {
  const original = originalExercise(card);
  return {
    ...card,
    exercise,
    replaced: exercise.id === original.id ? null : original,
    previous: null,
    sets: card.sets.map((set) => ({ ...set, weight: "", reps: "", suggestion: null })),
  };
}

// Applies an exercise's history: the reminder note, and the suggestion for each set by number.
export function withPrevious(card: WorkoutCard, previous: PreviousPerformance | null): WorkoutCard {
  return {
    ...card,
    previous,
    sets: card.sets.map((set) => ({ ...set, suggestion: suggestionForSet(previous, set.set_number) })),
  };
}

// Positions follow the on-screen order (1..n).
export function renumberCards(cards: readonly WorkoutCard[]): WorkoutCard[] {
  return cards.map((card, index) => (card.position === index + 1 ? card : { ...card, position: index + 1 }));
}

export function toSetRow(cardId: string, set: WorkoutSet): SessionSetRow {
  return {
    id: set.id,
    session_exercise_id: cardId,
    set_number: set.set_number,
    weight_kg: parseWeight(set.weight),
    reps: parseReps(set.reps),
    is_done: set.is_done,
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

// The values a done set shows: copied from the suggestion when the field was left empty.
export function markDone(set: WorkoutSet, values: { weight_kg: number | null; reps: number }): WorkoutSet {
  return { ...set, is_done: true, weight: formatWeight(values.weight_kg), reps: formatReps(values.reps) };
}

export function countUndoneSets(cards: readonly WorkoutCard[]): number {
  return cards.reduce((total, card) => total + card.sets.filter((set) => !set.is_done).length, 0);
}

export function countDoneSets(cards: readonly WorkoutCard[]): number {
  return cards.reduce((total, card) => total + card.sets.filter((set) => set.is_done).length, 0);
}
