import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import { EXERCISE_SUMMARY_COLUMNS, toSummary } from "@/lib/exercises/queries";
import { createClient } from "@/lib/supabase/server";
import type { TemplateDetail, TemplateSummary } from "./types";

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

export async function listTemplates(): Promise<{ active: TemplateSummary[]; archived: TemplateSummary[] }> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_templates")
    .select("id, name, is_archived, archived_at, template_exercises(count)")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const active: TemplateSummary[] = [];
  const archived: TemplateSummary[] = [];
  for (const row of data) {
    const summary: TemplateSummary = {
      id: row.id,
      name: row.name,
      is_archived: row.is_archived,
      archived_at: row.archived_at,
      exercise_count: row.template_exercises[0]?.count ?? 0,
    };
    (row.is_archived ? archived : active).push(summary);
  }
  return { active, archived };
}

export async function getTemplate(id: string): Promise<TemplateDetail | null> {
  await getCurrentUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workout_templates")
    .select(
      `id, name, is_archived, archived_at,
       template_exercises (
         id, position, planned_sets, rep_range_min, rep_range_max, note, target_weight_kg,
         exercise:exercises (${EXERCISE_SUMMARY_COLUMNS})
       )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    is_archived: data.is_archived,
    archived_at: data.archived_at,
    exercises: data.template_exercises.sort(byPosition).map((te) => ({
      id: te.id,
      position: te.position,
      planned_sets: te.planned_sets,
      rep_range_min: te.rep_range_min,
      rep_range_max: te.rep_range_max,
      note: te.note,
      target_weight_kg: te.target_weight_kg,
      exercise: toSummary(te.exercise),
    })),
  };
}
