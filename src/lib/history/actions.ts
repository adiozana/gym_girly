"use server";

import { revalidatePath } from "next/cache";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/session";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation/common";
import { exerciseSetsSchema } from "@/lib/validation/workout";

// Editing a past workout changes every calculation that reads it (SPEC.md "עריכת אימון שעבר").
function revalidateSession(sessionId: string) {
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath(`/workout/${sessionId}/summary`);
  revalidatePath("/history");
  revalidatePath("/exercises", "layout");
  revalidatePath("/");
}

// Rewrites all sets of one exercise in a saved workout (same weight and reps, done).
export async function saveLoggedExercise(sessionId: unknown, sets: unknown): Promise<ActionResult> {
  await getCurrentUser();
  const session = idSchema.safeParse(sessionId);
  const parsed = exerciseSetsSchema.safeParse(sets);
  if (!session.success) return fail();
  if (!parsed.success) return invalid(parsed.error);
  if (!parsed.data.is_done) return fail();

  const supabase = await createClient();
  const { sessionExerciseId, setIds, weight_kg, reps } = parsed.data;
  // The generated types mark the numbers as non-null; null weight means bodyweight.
  const args = {
    p_session_exercise_id: sessionExerciseId,
    p_set_ids: setIds,
    p_weight_kg: weight_kg ?? null,
    p_reps: reps,
    p_is_done: true,
  } as { p_session_exercise_id: string; p_set_ids: string[]; p_weight_kg: number; p_reps: number; p_is_done: boolean };
  const { error } = await supabase.rpc("save_session_exercise_sets", args);
  if (error) return fail(strings.common.saveFailed);

  revalidateSession(session.data);
  return ok(null);
}

// Removes one exercise from a saved workout. The last one stays: deleting the workout is the
// way to remove everything (a saved workout without exercises would still mark the day).
export async function removeLoggedExercise(sessionId: unknown, sessionExerciseId: unknown): Promise<ActionResult> {
  await getCurrentUser();
  const session = idSchema.safeParse(sessionId);
  const exercise = idSchema.safeParse(sessionExerciseId);
  if (!session.success || !exercise.success) return fail();

  const supabase = await createClient();
  const { count, error: countError } = await supabase
    .from("session_exercises")
    .select("id", { count: "exact", head: true })
    .eq("session_id", session.data);
  if (countError || (count ?? 0) <= 1) return fail(strings.session.lastExerciseHint);

  const { data, error } = await supabase
    .from("session_exercises")
    .delete()
    .eq("id", exercise.data)
    .eq("session_id", session.data)
    .select("id");
  if (error || data.length === 0) return fail();

  revalidateSession(session.data);
  return ok(null);
}

export async function deleteSavedSession(sessionId: unknown): Promise<ActionResult> {
  await getCurrentUser();
  const session = idSchema.safeParse(sessionId);
  if (!session.success) return fail();

  const supabase = await createClient();
  const { data, error } = await supabase.from("workout_sessions").delete().eq("id", session.data).select("id");
  if (error || data.length === 0) return fail();

  revalidateSession(session.data);
  return ok(null);
}
