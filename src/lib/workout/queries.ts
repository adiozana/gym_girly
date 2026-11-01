import "server-only";
import { suggestionForSet, type PreviousPerformance } from "@/lib/calc";
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
           template_exercise:template_exercises (
             planned_sets, rep_range_min, rep_range_max,
             template_exercise_alternatives (
               position,
               exercise:exercises (${EXERCISE_INFO_COLUMNS})
             )
           )
         )`,
      )
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.status !== "in_progress") return { session: data, previous: new Map<string, PreviousPerformance>() };

    const previous = await fetchPreviousPerformance(
      supabase,
      data.session_exercises.map((se) => se.exercise.id),
      data.id,
    );
    return { session: data, previous };
  };

  const [{ session, previous }, library] = await Promise.all([loadSession(), listExercises()]);
  if (!session) return { status: "not_found" };
  if (session.status !== "in_progress") return { status: "completed" };

  const cards: WorkoutCard[] = session.session_exercises.sort(byPosition).map((se) => {
    const history = previous.get(se.exercise.id) ?? null;
    const template = se.template_exercise;
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
          }
        : null,
      alternatives: template
        ? template.template_exercise_alternatives.sort(byPosition).map((alt) => toInfo(alt.exercise))
        : [],
      note: se.note ?? "",
      previous: history,
      sets: se.session_sets
        .sort((a, b) => a.set_number - b.set_number)
        .map((set) => ({
          id: set.id,
          set_number: set.set_number,
          weight: formatWeight(set.weight_kg == null ? null : Number(set.weight_kg)),
          reps: formatReps(set.reps),
          is_done: set.is_done,
          suggestion: suggestionForSet(history, set.set_number),
        })),
    };
  });

  return {
    status: "in_progress",
    workout: { id: session.id, template_name: session.template_name, started_at: session.started_at, cards },
    library: library.active,
  };
}
