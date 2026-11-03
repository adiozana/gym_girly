import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import { EXERCISE_SUMMARY_COLUMNS, toSummary } from "@/lib/exercises/queries";
import type { ExerciseSummary } from "@/lib/exercises/types";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export type LoggedSet = { id: string; set_number: number; weight_kg: number | null; reps: number };

export type SessionExerciseLog = {
  id: string;
  position: number;
  exercise: ExerciseSummary;
  replaced: ExerciseSummary | null;
  note: string | null;
  sets: LoggedSet[];
};

export type SessionLog = {
  id: string;
  template_name: string | null;
  session_date: string;
  started_at: string;
  completed_at: string | null;
  exercises: SessionExerciseLog[];
};

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;
const num = (value: number | string | null) => (value == null ? null : Number(value));

// A completed workout with its exercises and done sets (null when missing or still open).
export async function getSessionLog(id: string): Promise<SessionLog | null> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select(
      `id, template_name, session_date, started_at, completed_at, status,
       session_exercises (
         id, position, note,
         exercise:exercises!session_exercises_exercise_id_fkey (${EXERCISE_SUMMARY_COLUMNS}),
         replaced:exercises!session_exercises_replaced_exercise_id_fkey (${EXERCISE_SUMMARY_COLUMNS}),
         session_sets (id, set_number, weight_kg, reps, is_done)
       )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.status !== "completed") return null;

  return {
    id: data.id,
    template_name: data.template_name,
    session_date: data.session_date,
    started_at: data.started_at,
    completed_at: data.completed_at,
    exercises: data.session_exercises.sort(byPosition).map((se) => ({
      id: se.id,
      position: se.position,
      exercise: toSummary(se.exercise),
      replaced: se.replaced ? toSummary(se.replaced) : null,
      note: se.note,
      sets: se.session_sets
        .filter((set) => set.is_done && set.reps != null)
        .sort((a, b) => a.set_number - b.set_number)
        .map((set) => ({ id: set.id, set_number: set.set_number, weight_kg: num(set.weight_kg), reps: set.reps ?? 0 })),
    })),
  };
}

// For each exercise, the done sets of the last completed workout that started before `before`.
export async function getPreviousSets(
  supabase: Supabase,
  exerciseIds: readonly string[],
  before: string,
): Promise<Map<string, { weight_kg: number | null; reps: number }[]>> {
  const result = new Map<string, { weight_kg: number | null; reps: number }[]>();
  if (exerciseIds.length === 0) return result;
  const { data, error } = await supabase.rpc("previous_performance", {
    p_exercise_ids: [...new Set(exerciseIds)],
    p_before: before,
  });
  if (error) throw error;
  for (const row of data) {
    result.set(row.exercise_id, [...(result.get(row.exercise_id) ?? []), { weight_kg: num(row.weight_kg), reps: row.reps }]);
  }
  return result;
}

// The workout and the sets it is compared with (SPEC.md "סיכום אימון").
export async function getSummaryData(id: string) {
  const log = await getSessionLog(id);
  if (!log) return null;
  const supabase = await createClient();
  const previous = await getPreviousSets(
    supabase,
    log.exercises.map((exercise) => exercise.exercise.id),
    log.started_at,
  );
  return { log, previous };
}

export type ExerciseHistoryEntry = {
  sessionId: string;
  date: string;
  template_name: string | null;
  sets: { weight_kg: number | null; reps: number }[];
};

// Every completed workout where the exercise was performed, newest first (SPEC.md "דף תרגיל").
export async function getExerciseHistory(exerciseId: string): Promise<ExerciseHistoryEntry[]> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_exercises")
    .select(
      `position,
       session:workout_sessions!inner (id, session_date, started_at, template_name, status),
       session_sets (set_number, weight_kg, reps, is_done)`,
    )
    .eq("exercise_id", exerciseId)
    .eq("session.status", "completed");
  if (error) throw error;

  return data
    .sort((a, b) => b.session.started_at.localeCompare(a.session.started_at) || a.position - b.position)
    .map((row) => ({
      sessionId: row.session.id,
      date: row.session.session_date,
      template_name: row.session.template_name,
      sets: row.session_sets
        .filter((set) => set.is_done && set.reps != null)
        .sort((a, b) => a.set_number - b.set_number)
        .map((set) => ({ weight_kg: num(set.weight_kg), reps: set.reps ?? 0 })),
    }))
    .filter((entry) => entry.sets.length > 0);
}
