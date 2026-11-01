import type { PreviousPerformance } from "@/lib/calc";
import type { ExerciseSummary } from "@/lib/exercises/types";

export type { PreviousPerformance } from "@/lib/calc";
export type { SetSuggestion } from "./set-input";

export type ExerciseInfo = ExerciseSummary & { instructions_he: string | null };

// The plan for this exercise ("3 × 8–12", current weight), when the card came from a plan.
export type PlannedReps = {
  planned_sets: number;
  rep_range_min: number | null;
  rep_range_max: number | null;
  target_weight_kg: number | null;
};

// One exercise row (SPEC.md): one weight and reps for the whole exercise, and one tap marks
// all its sets done. Every set is still its own session_sets row (setIds), with equal values.
export type WorkoutCard = {
  id: string;
  position: number;
  exercise: ExerciseInfo;
  // The original exercise when swapped for an alternative (SPEC.md: replaced_exercise_id).
  replaced: ExerciseInfo | null;
  template_exercise_id: string | null;
  plan: PlannedReps | null;
  // The 2 fixed alternatives of the original exercise (from the library).
  alternatives: ExerciseInfo[];
  note: string;
  previous: PreviousPerformance | null;
  setIds: string[];
  // The fields keep the text as typed; empty shows the suggestion as a placeholder.
  weight: string;
  reps: string;
  done: boolean;
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
