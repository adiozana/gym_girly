import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Equipment, ExerciseSummary, MuscleGroup } from "./types";

type ExerciseRow = {
  id: string;
  name_he: string;
  name_en: string | null;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  user_id: string | null;
};

export const EXERCISE_SUMMARY_COLUMNS = "id, name_he, name_en, muscle_group, equipment, user_id";

export function toSummary(row: ExerciseRow): ExerciseSummary {
  return {
    id: row.id,
    name_he: row.name_he,
    name_en: row.name_en,
    muscle_group: row.muscle_group,
    equipment: row.equipment,
    is_personal: row.user_id !== null,
  };
}

const byHebrewName = (a: ExerciseSummary, b: ExerciseSummary) => a.name_he.localeCompare(b.name_he, "he");

// Built-in + own exercises (RLS filters to what the user may see), split by archive state.
export async function listExercises(): Promise<{ active: ExerciseSummary[]; archived: ExerciseSummary[] }> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select(`${EXERCISE_SUMMARY_COLUMNS}, is_archived`);
  if (error) throw error;

  const active: ExerciseSummary[] = [];
  const archived: ExerciseSummary[] = [];
  for (const row of data) (row.is_archived ? archived : active).push(toSummary(row));
  return { active: active.sort(byHebrewName), archived: archived.sort(byHebrewName) };
}

export type ExerciseDetail = ExerciseSummary & {
  instructions_he: string | null;
  is_archived: boolean;
  in_use: boolean;
  alternatives: ExerciseSummary[];
};

// The 2 fixed alternatives of each exercise (SPEC.md), in order, keyed by exercise id.
export async function getAlternatives(exerciseIds: readonly string[]): Promise<Map<string, ExerciseSummary[]>> {
  const result = new Map<string, ExerciseSummary[]>();
  if (exerciseIds.length === 0) return result;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercise_alternatives")
    .select(`exercise_id, position, alternative:exercises!alternative_exercise_id (${EXERCISE_SUMMARY_COLUMNS})`)
    .in("exercise_id", [...new Set(exerciseIds)])
    .order("position");
  if (error) throw error;
  for (const row of data) {
    const list = result.get(row.exercise_id) ?? [];
    list.push(toSummary(row.alternative));
    result.set(row.exercise_id, list);
  }
  return result;
}

export async function getExercise(id: string): Promise<ExerciseDetail | null> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .select(`${EXERCISE_SUMMARY_COLUMNS}, instructions_he, is_archived`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [usage, alternatives] = await Promise.all([
    data.user_id !== null ? supabase.rpc("exercise_in_use", { p_exercise_id: id }) : null,
    getAlternatives([id]),
  ]);
  if (usage?.error) throw usage.error;

  return {
    ...toSummary(data),
    instructions_he: data.instructions_he,
    is_archived: data.is_archived,
    in_use: usage?.data ?? false,
    alternatives: alternatives.get(id) ?? [],
  };
}
