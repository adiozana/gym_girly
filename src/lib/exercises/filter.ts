import type { Equipment, ExerciseSummary, MuscleGroup } from "./types";

export type ExerciseFilter = {
  query?: string;
  muscleGroup?: MuscleGroup | null;
  equipment?: Equipment | null;
};

// Lower-cases and drops punctuation that people type inconsistently
// (Hebrew maqaf/geresh, hyphens, apostrophes), so "גט אפ" finds "גט־אפ".
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[־׳״'"`\-.,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Every word of the query must appear in the Hebrew or English name.
export function matchesQuery(exercise: Pick<ExerciseSummary, "name_he" | "name_en">, query: string) {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeSearch(`${exercise.name_he} ${exercise.name_en ?? ""}`);
  return words.every((word) => haystack.includes(word));
}

export function filterExercises<T extends ExerciseSummary>(exercises: T[], filter: ExerciseFilter): T[] {
  return exercises.filter(
    (exercise) =>
      (!filter.muscleGroup || exercise.muscle_group === filter.muscleGroup) &&
      (!filter.equipment || exercise.equipment === filter.equipment) &&
      matchesQuery(exercise, filter.query ?? ""),
  );
}
