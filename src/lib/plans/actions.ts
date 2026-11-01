"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/session";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation/common";
import {
  reorderSchema,
  templateExerciseSettingsSchema,
  templateNameSchema,
  type TemplateExerciseSettings,
} from "@/lib/validation/plans";

// The editor keeps its own optimistic state, so only the list needs refreshing
// after per-exercise edits (its exercise counts change).
function revalidatePlans(templateId?: string) {
  revalidatePath("/plans");
  if (templateId) revalidatePath(`/plans/${templateId}`);
}

const idPair = z.object({ parentId: idSchema, exerciseId: idSchema });

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export async function createTemplate(name: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  const parsed = templateNameSchema.safeParse(name);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_templates")
    .insert({ user_id: user.id, name: parsed.data })
    .select("id")
    .single();
  if (error) return fail();

  revalidatePlans();
  return ok({ id: data.id });
}

export async function renameTemplate(id: unknown, name: unknown): Promise<ActionResult<{ name: string }>> {
  await getCurrentUser();
  const templateId = idSchema.safeParse(id);
  const parsed = templateNameSchema.safeParse(name);
  if (!templateId.success) return fail();
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_templates")
    .update({ name: parsed.data })
    .eq("id", templateId.data)
    .select("id");
  if (error || data.length === 0) return fail();

  revalidatePlans(templateId.data);
  return ok({ name: parsed.data });
}

export async function duplicateTemplate(id: unknown): Promise<ActionResult<{ id: string }>> {
  await getCurrentUser();
  const templateId = idSchema.safeParse(id);
  if (!templateId.success) return fail();

  const supabase = await createClient();
  const source = await supabase
    .from("workout_templates")
    .select("name")
    .eq("id", templateId.data)
    .maybeSingle();
  if (source.error || !source.data) return fail();

  const name = `${source.data.name} ${strings.plans.copySuffix}`.slice(0, 60);
  const { data, error } = await supabase.rpc("duplicate_template", {
    p_template_id: templateId.data,
    p_name: name,
  });
  if (error) return fail();

  revalidatePlans();
  return ok({ id: data });
}

export async function archiveTemplate(id: unknown): Promise<ActionResult<{ removedAssignments: number }>> {
  await getCurrentUser();
  const templateId = idSchema.safeParse(id);
  if (!templateId.success) return fail();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("archive_template", { p_template_id: templateId.data });
  if (error) return fail();

  revalidatePlans(templateId.data);
  return ok({ removedAssignments: data });
}

export async function restoreTemplate(id: unknown): Promise<ActionResult> {
  await getCurrentUser();
  const templateId = idSchema.safeParse(id);
  if (!templateId.success) return fail();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_templates")
    .update({ is_archived: false })
    .eq("id", templateId.data)
    .select("id");
  if (error || data.length === 0) return fail();

  revalidatePlans(templateId.data);
  return ok(null);
}

// ---------------------------------------------------------------------------
// Exercises inside a template
// ---------------------------------------------------------------------------

export async function addTemplateExercise(
  templateId: unknown,
  exerciseId: unknown,
): Promise<ActionResult<{ id: string; position: number }>> {
  await getCurrentUser();
  const parsed = idPair.safeParse({ parentId: templateId, exerciseId });
  if (!parsed.success) return fail();

  const supabase = await createClient();
  const last = await supabase
    .from("template_exercises")
    .select("position")
    .eq("template_id", parsed.data.parentId)
    .order("position", { ascending: false })
    .limit(1);
  if (last.error) return fail();
  const position = (last.data[0]?.position ?? 0) + 1;

  // RLS rejects templates the user doesn't own and exercises they can't see.
  const { data, error } = await supabase
    .from("template_exercises")
    .insert({ template_id: parsed.data.parentId, exercise_id: parsed.data.exerciseId, position })
    .select("id, position")
    .single();
  if (error) return fail();

  revalidatePlans();
  return ok(data);
}

export async function updateTemplateExercise(
  id: unknown,
  settings: unknown,
): Promise<ActionResult<TemplateExerciseSettings>> {
  await getCurrentUser();
  const templateExerciseId = idSchema.safeParse(id);
  const parsed = templateExerciseSettingsSchema.safeParse(settings);
  if (!templateExerciseId.success) return fail();
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("template_exercises")
    .update(parsed.data)
    .eq("id", templateExerciseId.data)
    .select("id");
  if (error || data.length === 0) return fail();

  return ok(parsed.data);
}

export async function removeTemplateExercise(id: unknown): Promise<ActionResult> {
  await getCurrentUser();
  const templateExerciseId = idSchema.safeParse(id);
  if (!templateExerciseId.success) return fail();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("template_exercises")
    .delete()
    .eq("id", templateExerciseId.data)
    .select("id");
  if (error || data.length === 0) return fail();

  revalidatePlans();
  return ok(null);
}

export async function reorderTemplateExercises(templateId: unknown, orderedIds: unknown): Promise<ActionResult> {
  await getCurrentUser();
  const parsed = reorderSchema.safeParse({ parentId: templateId, orderedIds });
  if (!parsed.success) return fail();

  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_template_exercises", {
    p_template_id: parsed.data.parentId,
    p_ids: parsed.data.orderedIds,
  });
  if (error) return fail();
  return ok(null);
}
