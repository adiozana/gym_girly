import { z } from "zod";

// A plan drafted by the AI assistant from free text, before it is saved as a real plan.
export type DraftExercise = {
  exercise_id: string;
  planned_sets: number;
  rep_range_min: number | null;
  rep_range_max: number | null;
  target_weight_kg: number | null;
  note: string | null;
};

export type PlanDraft = { name: string; exercises: DraftExercise[] };

export const MAX_DRAFT_EXERCISES = 20;

// What the model is asked to return (also sent to Gemini as the response schema).
export const draftResponseSchema = z.object({
  name: z.string(),
  exercises: z.array(
    z.object({
      exercise_id: z.string(),
      planned_sets: z.number().nullable().optional(),
      rep_range_min: z.number().nullable().optional(),
      rep_range_max: z.number().nullable().optional(),
      target_weight_kg: z.number().nullable().optional(),
      note: z.string().nullable().optional(),
    }),
  ),
  message: z.string(),
});

export type DraftResponse = z.infer<typeof draftResponseSchema>;

const clampInt = (value: number | null | undefined, min: number, max: number): number | null => {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.min(max, Math.max(min, Math.round(value)));
};

// The model's output is never trusted: unknown or repeated exercises are dropped, numbers are
// clamped to the plan's rules (sets 1..10, reps 1..999 with min <= max, weight 0..9999.99 with
// two decimals) and texts are trimmed. Returns the draft and the ids that were dropped.
export function sanitizeDraft(
  raw: DraftResponse,
  knownExerciseIds: ReadonlySet<string>,
  fallbackName: string,
): { draft: PlanDraft; dropped: string[] } {
  const dropped: string[] = [];
  const seen = new Set<string>();
  const exercises: DraftExercise[] = [];

  for (const item of raw.exercises) {
    if (!knownExerciseIds.has(item.exercise_id) || seen.has(item.exercise_id)) {
      dropped.push(item.exercise_id);
      continue;
    }
    if (exercises.length >= MAX_DRAFT_EXERCISES) break;
    seen.add(item.exercise_id);

    let min = clampInt(item.rep_range_min, 1, 999);
    let max = clampInt(item.rep_range_max, 1, 999);
    if (min != null && max == null) max = min;
    if (max != null && min == null) min = max;
    if (min != null && max != null && min > max) [min, max] = [max, min];

    const weight =
      item.target_weight_kg == null || !Number.isFinite(item.target_weight_kg) || item.target_weight_kg < 0
        ? null
        : Math.min(9999.99, Math.round(item.target_weight_kg * 100) / 100);
    const note = item.note?.trim().slice(0, 300) || null;

    exercises.push({
      exercise_id: item.exercise_id,
      planned_sets: clampInt(item.planned_sets, 1, 10) ?? 3,
      rep_range_min: min,
      rep_range_max: max,
      target_weight_kg: weight,
      note,
    });
  }

  const name = raw.name.trim().slice(0, 60) || fallbackName;
  return { draft: { name, exercises }, dropped };
}

// True when a turn recognized nothing: the draft has no exercises, or nothing in it changed
// (same name and the same exercises with the same settings).
export function recognizedNothing(before: PlanDraft, after: PlanDraft): boolean {
  if (after.exercises.length === 0) return true;
  return before.name === after.name && JSON.stringify(before.exercises) === JSON.stringify(after.exercises);
}
