import type { PreviousPerformance } from "@/lib/calc";
import type { ExerciseSummary } from "@/lib/exercises/types";
import type { SetSuggestion } from "./set-input";

export type { PreviousPerformance } from "@/lib/calc";
export type { SetSuggestion } from "./set-input";

export type ExerciseInfo = ExerciseSummary & { instructions_he: string | null };

// One set row as the screen holds it: the fields keep the typed text, and the suggestion
// (previous performance, or the set above for an added set) shows as a placeholder.
export type WorkoutSet = {
  id: string;
  set_number: number;
  weight: string;
  reps: string;
  is_done: boolean;
  suggestion: SetSuggestion;
};

// The template's plan for this exercise ("3 × 8–12"), when the card came from a template.
export type PlannedReps = {
  planned_sets: number;
  rep_range_min: number | null;
  rep_range_max: number | null;
};

export type WorkoutCard = {
  id: string;
  position: number;
  exercise: ExerciseInfo;
  // The original exercise when swapped for an alternative (SPEC.md: replaced_exercise_id).
  replaced: ExerciseInfo | null;
  template_exercise_id: string | null;
  plan: PlannedReps | null;
  // The template's alternatives, in priority order.
  alternatives: ExerciseInfo[];
  note: string;
  previous: PreviousPerformance | null;
  sets: WorkoutSet[];
};

export type WorkoutData = {
  id: string;
  template_name: string | null;
  started_at: string;
  cards: WorkoutCard[];
};

export type ActiveSession = {
  id: string;
  template_name: string | null;
  started_at: string;
};
