"use server";

import { revalidatePath } from "next/cache";
import type { PreviousPerformance } from "@/lib/calc";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/session";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation/common";
import {
  exerciseContextSchema,
  startSessionSchema,
  workoutOpSchema,
  workoutOpsSchema,
  type WorkoutOp,
} from "@/lib/validation/workout";
import { fetchAlternatives, fetchPreviousPerformance } from "./queries";
import type { ExerciseInfo } from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type DbError = { code?: string } | null;

// ---------------------------------------------------------------------------
// Start, complete, delete
// ---------------------------------------------------------------------------

// Starts a workout from a plan (or a free one) on the device's local date. If one is already
// open, returns it instead (SPEC.md: a new one doesn't start while one is open).
export async function startSession(
  templateId: unknown,
  localDate: unknown,
): Promise<ActionResult<{ id: string; alreadyOpen: boolean }>> {
  await getCurrentUser();
  const parsed = startSessionSchema.safeParse({ templateId, localDate });
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  // The generated types mark p_template_id as non-null, but null starts a free workout.
  const args = { p_template_id: parsed.data.templateId, p_session_date: parsed.data.localDate } as {
    p_template_id: string;
    p_session_date: string;
  };
  const { data, error } = await supabase.rpc("start_session", args);

  if (error?.code === "23505") {
    const open = await supabase.from("workout_sessions").select("id").eq("status", "in_progress").maybeSingle();
    if (open.error || !open.data) return fail();
    return ok({ id: open.data.id, alreadyOpen: true });
  }
  if (error?.code === "P0002") return fail(strings.workout.start.templateNotFound);
  if (error) return fail();

  // Home shows the "continue workout" banner from now on.
  revalidatePath("/");
  return ok({ id: data, alreadyOpen: false });
}

// Saves the workout (SPEC.md "שמירת אימון"). completed: false means no set was done, so
// nothing changed and the workout can't be saved.
export async function completeSession(sessionId: unknown): Promise<ActionResult<{ completed: boolean }>> {
  await getCurrentUser();
  const id = idSchema.safeParse(sessionId);
  if (!id.success) return fail();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("complete_session", { p_session_id: id.data });
  if (error) return fail();
  return ok({ completed: data });
}

export async function deleteSession(sessionId: unknown): Promise<ActionResult> {
  await getCurrentUser();
  const id = idSchema.safeParse(sessionId);
  if (!id.success) return fail();

  const supabase = await createClient();
  const { data, error } = await supabase.from("workout_sessions").delete().eq("id", id.data).select("id");
  if (error || data.length === 0) return fail();
  return ok(null);
}

// ---------------------------------------------------------------------------
// Autosave: the client's write queue sends batches of ops
// ---------------------------------------------------------------------------

export type ApplyOpsResult = {
  // How many ops from the start of the batch were saved.
  applied: number;
  // Why the next op wasn't: "transient" (try again later) or "permanent" (it can never
  // succeed, e.g. its row was deleted elsewhere, so the client drops it).
  failure: "transient" | "permanent" | null;
};

// Constraint, data and permission errors won't go away by retrying; anything else
// (network, timeouts, the API being down) might.
function isPermanent(error: DbError): boolean {
  return Boolean(error?.code && /^(22|23|42)/.test(error.code));
}

async function applyOp(supabase: Supabase, sessionId: string, op: WorkoutOp): Promise<DbError> {
  switch (op.kind) {
    case "saveSets": {
      const { sessionExerciseId, setIds, weight_kg, reps, is_done } = op.sets;
      // The generated types mark the numbers as non-null; null means "not entered".
      const args = {
        p_session_exercise_id: sessionExerciseId,
        p_set_ids: setIds,
        p_weight_kg: weight_kg ?? null,
        p_reps: reps ?? null,
        p_is_done: is_done,
      } as { p_session_exercise_id: string; p_set_ids: string[]; p_weight_kg: number; p_reps: number; p_is_done: boolean };
      const { error } = await supabase.rpc("save_session_exercise_sets", args);
      // The exercise is gone (removed, or the op is replayed after a reload): nothing to do.
      return error?.code === "P0002" ? null : error;
    }
    case "upsertExercise": {
      const { id, template_exercise_id, ...fields } = op.exercise;
      // Update first: the template link is set once, at insert, and never rewritten (the
      // template exercise may have been deleted since, which only nulls the link).
      const updated = await supabase
        .from("session_exercises")
        .update(fields)
        .eq("id", id)
        .select("id");
      if (updated.error) return updated.error;
      if (updated.data.length > 0) return null;

      const row = { id, session_id: sessionId, ...fields };
      const inserted = await supabase.from("session_exercises").insert({ ...row, template_exercise_id });
      if (inserted.error?.code === "23503" && template_exercise_id) {
        // The template exercise is gone: keep the card without the link.
        const retry = await supabase.from("session_exercises").insert({ ...row, template_exercise_id: null });
        return retry.error;
      }
      // A replayed insert that already landed is fine.
      return inserted.error?.code === "23505" ? null : inserted.error;
    }
    case "deleteExercise": {
      const { error } = await supabase.from("session_exercises").delete().eq("id", op.id);
      return error;
    }
  }
}

// Applies ops in order and stops at the first failure. RLS limits every write to the
// user's own sessions.
export async function applyWorkoutOps(sessionId: unknown, ops: unknown): Promise<ActionResult<ApplyOpsResult>> {
  await getCurrentUser();
  const id = idSchema.safeParse(sessionId);
  const list = workoutOpsSchema.safeParse(ops);
  if (!id.success || !list.success) return fail();

  const supabase = await createClient();
  let applied = 0;
  for (const raw of list.data) {
    const op = workoutOpSchema.safeParse(raw);
    if (!op.success) return ok({ applied, failure: "permanent" });
    let error: DbError;
    try {
      error = await applyOp(supabase, id.data, op.data);
    } catch {
      return ok({ applied, failure: "transient" });
    }
    if (error) return ok({ applied, failure: isPermanent(error) ? "permanent" : "transient" });
    applied++;
  }
  return ok({ applied, failure: null });
}

// An exercise's instructions and history, for a card that just got it (swap or add).
export async function getExerciseContext(
  exerciseId: unknown,
  excludeSessionId: unknown,
): Promise<
  ActionResult<{ instructions_he: string | null; previous: PreviousPerformance | null; alternatives: ExerciseInfo[] }>
> {
  await getCurrentUser();
  const parsed = exerciseContextSchema.safeParse({ exerciseId, excludeSessionId });
  if (!parsed.success) return fail();

  const supabase = await createClient();
  const [exercise, previous, alternatives] = await Promise.all([
    supabase.from("exercises").select("instructions_he").eq("id", parsed.data.exerciseId).maybeSingle(),
    fetchPreviousPerformance(supabase, [parsed.data.exerciseId], parsed.data.excludeSessionId).catch(() => null),
    fetchAlternatives(supabase, [parsed.data.exerciseId]).catch(() => null),
  ]);
  if (exercise.error || !exercise.data || !previous || !alternatives) return fail();
  return ok({
    instructions_he: exercise.data.instructions_he,
    previous: previous.get(parsed.data.exerciseId) ?? null,
    alternatives: alternatives.get(parsed.data.exerciseId) ?? [],
  });
}
