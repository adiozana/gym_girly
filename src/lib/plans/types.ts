import type { ExerciseSummary } from "@/lib/exercises/types";

export type TemplateSummary = {
  id: string;
  name: string;
  is_archived: boolean;
  exercise_count: number;
};

export type TemplateAlternative = {
  id: string;
  position: number;
  exercise: ExerciseSummary;
};

export type TemplateExerciseItem = {
  id: string;
  position: number;
  planned_sets: number;
  rep_range_min: number | null;
  rep_range_max: number | null;
  note: string | null;
  exercise: ExerciseSummary;
  alternatives: TemplateAlternative[];
};

export type TemplateDetail = {
  id: string;
  name: string;
  is_archived: boolean;
  exercises: TemplateExerciseItem[];
};
