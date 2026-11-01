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
};

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

  let inUse = false;
  if (data.user_id !== null) {
    const usage = await supabase.rpc("exercise_in_use", { p_exercise_id: id });
    if (usage.error) throw usage.error;
    inUse = usage.data;
  }

  return {
    ...toSummary(data),
    instructions_he: data.instructions_he,
    is_archived: data.is_archived,
    in_use: inUse,
  };
}
