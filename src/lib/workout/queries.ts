import "server-only";
import type { PreviousPerformance } from "@/lib/calc";
import { getCurrentUser } from "@/lib/auth/session";
import { EXERCISE_SUMMARY_COLUMNS, listExercises, toSummary } from "@/lib/exercises/queries";
import type { ExerciseSummary } from "@/lib/exercises/types";
import { createClient } from "@/lib/supabase/server";
import { groupPreviousPerformance } from "./previous";
import { formatReps, formatWeight } from "./set-input";
import type { ActiveSession, ExerciseInfo, WorkoutCard, WorkoutData } from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const EXERCISE_INFO_COLUMNS = `${EXERCISE_SUMMARY_COLUMNS}, instructions_he`;

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

function toInfo(row: Parameters<typeof toSummary>[0] & { instructions_he: string | null }): ExerciseInfo {
  return { ...toSummary(row), instructions_he: row.instructions_he };
}

export async function fetchPreviousPerformance(
  supabase: Supabase,
  exerciseIds: readonly string[],
  excludeSessionId: string,
): Promise<Map<string, PreviousPerformance>> {
  if (exerciseIds.length === 0) return new Map();
  const { data, error } = await supabase.rpc("previous_performance", {
    p_exercise_ids: [...new Set(exerciseIds)],
    p_exclude_session_id: excludeSessionId,
  });
  if (error) throw error;
  return groupPreviousPerformance(data);
}

// The 2 fixed alternatives of each exercise (with instructions, for the row's accordion).
export async function fetchAlternatives(
  supabase: Supabase,
  exerciseIds: readonly string[],
): Promise<Map<string, ExerciseInfo[]>> {
  const result = new Map<string, ExerciseInfo[]>();
  if (exerciseIds.length === 0) return result;
  const { data, error } = await supabase
    .from("exercise_alternatives")
    .select(`exercise_id, position, alternative:exercises!alternative_exercise_id (${EXERCISE_INFO_COLUMNS})`)
    .in("exercise_id", [...new Set(exerciseIds)])
    .order("position");
  if (error) throw error;
  for (const row of data) {
    result.set(row.exercise_id, [...(result.get(row.exercise_id) ?? []), toInfo(row.alternative)]);
  }
  return result;
}

// The user's open workout, if any (at most one: one_active_session).
export async function getActiveSession(): Promise<ActiveSession | null> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, template_name, started_at")
    .eq("status", "in_progress")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type WorkoutPageData =
  | { status: "not_found" }
  | { status: "completed" }
  | { status: "in_progress"; workout: WorkoutData; library: ExerciseSummary[] };

// Everything the active-workout screen needs. The session (with its exercises, sets and the
// template's plan and alternatives) and the exercise library load in parallel; previous
// performance follows the session, since it needs its exercise ids.
export async function getWorkout(id: string): Promise<WorkoutPageData> {
  await getCurrentUser();
  const supabase = await createClient();

  const loadSession = async () => {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select(
        `id, template_name, started_at, status,
         session_exercises (
           id, position, note, template_exercise_id,
           exercise:exercises!session_exercises_exercise_id_fkey (${EXERCISE_INFO_COLUMNS}),
           replaced:exercises!session_exercises_replaced_exercise_id_fkey (${EXERCISE_INFO_COLUMNS}),
           session_sets (id, set_number, weight_kg, reps, is_done),
           template_exercise:template_exercises (planned_sets, rep_range_min, rep_range_max, target_weight_kg)
         )`,
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.status !== "in_progress") {
      return { session: data, previous: new Map<string, PreviousPerformance>(), alternatives: new Map<string, ExerciseInfo[]>() };
    }

    const [previous, alternatives] = await Promise.all([
      fetchPreviousPerformance(supabase, data.session_exercises.map((se) => se.exercise.id), data.id),
      fetchAlternatives(supabase, data.session_exercises.map((se) => (se.replaced ?? se.exercise).id)),
    ]);
    return { session: data, previous, alternatives };
  };

  const [{ session, previous, alternatives }, library] = await Promise.all([loadSession(), listExercises()]);
  if (!session) return { status: "not_found" };
  if (session.status !== "in_progress") return { status: "completed" };

  const cards: WorkoutCard[] = session.session_exercises.sort(byPosition).map((se) => {
    const template = se.template_exercise;
    const sets = se.session_sets.sort((a, b) => a.set_number - b.set_number);
    // The sets of a row are uniform; older data may not be, so the first set speaks for them.
    const first = sets[0];
    return {
      id: se.id,
      position: se.position,
      exercise: toInfo(se.exercise),
      replaced: se.replaced ? toInfo(se.replaced) : null,
      template_exercise_id: se.template_exercise_id,
      plan: template
        ? {
            planned_sets: template.planned_sets,
            rep_range_min: template.rep_range_min,
            rep_range_max: template.rep_range_max,
            target_weight_kg: template.target_weight_kg == null ? null : Number(template.target_weight_kg),
          }
        : null,
      alternatives: alternatives.get((se.replaced ?? se.exercise).id) ?? [],
      note: se.note ?? "",
      previous: previous.get(se.exercise.id) ?? null,
      setIds: sets.map((set) => set.id),
      weight: formatWeight(first?.weight_kg == null ? null : Number(first.weight_kg)),
      reps: formatReps(first?.reps ?? null),
      done: sets.length > 0 && sets.every((set) => set.is_done),
    };
  });

  return {
    status: "in_progress",
    workout: { id: session.id, template_name: session.template_name, started_at: session.started_at, cards },
    library: library.active,
  };
}
