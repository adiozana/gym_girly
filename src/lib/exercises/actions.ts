"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/session";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation/common";
import { exerciseInputSchema } from "@/lib/validation/exercises";

function revalidateExercises(id?: string) {
  revalidatePath("/exercises");
  if (id) revalidatePath(`/exercises/${id}`);
}

export async function createExercise(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  const parsed = exerciseInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .insert({ ...parsed.data, user_id: user.id })
    .select("id")
    .single();
  if (error) return fail();

  revalidateExercises();
  return ok({ id: data.id });
}

export async function updateExercise(id: unknown, input: unknown): Promise<ActionResult> {
  await getCurrentUser();
  const exerciseId = idSchema.safeParse(id);
  const parsed = exerciseInputSchema.safeParse(input);
  if (!exerciseId.success) return fail();
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  // RLS limits updates to the user's own exercises; built-ins match no row.
  const { data, error } = await supabase
    .from("exercises")
    .update(parsed.data)
    .eq("id", exerciseId.data)
    .select("id");
  if (error || data.length === 0) return fail();

  revalidateExercises(exerciseId.data);
  return ok(null);
}

export async function setExerciseArchived(id: unknown, archived: boolean): Promise<ActionResult> {
  await getCurrentUser();
  const exerciseId = idSchema.safeParse(id);
  if (!exerciseId.success) return fail();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .update({ is_archived: archived })
    .eq("id", exerciseId.data)
    .select("id");
  if (error || data.length === 0) return fail();

  revalidateExercises(exerciseId.data);
  return ok(null);
}

export async function deleteExercise(id: unknown): Promise<ActionResult> {
  await getCurrentUser();
  const exerciseId = idSchema.safeParse(id);
  if (!exerciseId.success) return fail();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("exercises")
    .delete()
    .eq("id", exerciseId.data)
    .select("id");
  // 23503: still referenced by a template or session, so it may only be archived.
  if (error?.code === "23503") return fail(strings.exercises.detail.cannotDelete);
  if (error || data.length === 0) return fail();

  revalidateExercises();
  return ok(null);
}

// Replaces a personal exercise's 2 alternatives (built-ins are fixed; the function rejects them).
export async function setExerciseAlternatives(id: unknown, alternativeIds: unknown): Promise<ActionResult> {
  await getCurrentUser();
  const exerciseId = idSchema.safeParse(id);
  const ids = z.array(idSchema).max(2).safeParse(alternativeIds);
  if (!exerciseId.success || !ids.success) return fail();
  if (ids.data.includes(exerciseId.data) || new Set(ids.data).size !== ids.data.length) return fail();

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_exercise_alternatives", {
    p_exercise_id: exerciseId.data,
    p_ids: ids.data,
  });
  if (error) return fail();

  revalidateExercises(exerciseId.data);
  return ok(null);
}
