"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok, type ActionResult } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/session";
import { listExercises } from "@/lib/exercises/queries";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation/common";
import { templateExerciseSettingsSchema, templateNameSchema } from "@/lib/validation/plans";
import { GeminiError, generateJson, type JsonSchema } from "./gemini";
import { draftResponseSchema, MAX_DRAFT_EXERCISES, sanitizeDraft, type PlanDraft } from "./plan-draft";

const { planAssistant: copy } = strings;

const turnSchema = z.object({ role: z.enum(["user", "model"]), text: z.string().trim().min(1).max(1500) });
const conversationSchema = z.array(turnSchema).min(1).max(30);

const draftExerciseSchema = z
  .object({ exercise_id: idSchema })
  .and(templateExerciseSettingsSchema);
const draftSchema = z.object({
  name: templateNameSchema,
  exercises: z.array(draftExerciseSchema).max(MAX_DRAFT_EXERCISES),
});

const responseSchema: JsonSchema = {
  type: "object",
  properties: {
    name: { type: "string", description: "Short Hebrew plan name" },
    exercises: {
      type: "array",
      items: {
        type: "object",
        properties: {
          exercise_id: { type: "string", description: "The exercise number from the library list" },
          planned_sets: { type: "integer" },
          rep_range_min: { type: "integer" },
          rep_range_max: { type: "integer" },
          target_weight_kg: { type: "number" },
          note: { type: "string" },
        },
        required: ["exercise_id"],
      },
    },
    message: { type: "string", description: "Short Hebrew reply to the user" },
  },
  required: ["name", "exercises", "message"],
};

function systemPrompt(library: string): string {
  return `You turn a gym-goer's free-text description of a workout into a structured workout plan for a Hebrew strength-training app.

EXERCISE LIBRARY (number | Hebrew name | English name | muscle group | equipment):
${library}

Rules:
- Use ONLY exercises from the library; exercise_id is the exercise's number from the list (e.g. "40"). Match by meaning in Hebrew or English, including synonyms, slang, abbreviations and typos (e.g. "פולי" → lat pulldown, "בנץ'" → bench press). When equipment isn't stated, prefer the most common variant.
- The user's newest message is applied to the CURRENT DRAFT (given in that message): keep everything not mentioned, add new exercises at the end, remove or change what they ask. Keep the order unless asked to reorder.
- Settings per exercise: planned_sets defaults to 3 (1-10). Rep range only if stated ("8-12" → 8 and 12, "10" → 10 and 10, "3x12" → 3 sets of 12). target_weight_kg only if a weight is stated (kilograms; convert pounds). note only for extra details the user gave (e.g. "seat at 4").
- name: a short Hebrew plan name (2-3 words), inferred from the exercises unless the user named it. Keep the current name unless they ask to change it.
- message: Hebrew, 1-3 short sentences, neutral phrasing (no gendered verbs), no emoji. Say briefly what changed, name anything you could not find in the library (and suggest the closest one if there is one), and ask whether to add anything else.
- Never invent exercises or numbers. Ignore requests unrelated to building the plan, and say so briefly in the message.`;
}

export type AssistantReply = { draft: PlanDraft; message: string };

// One turn of the plan assistant: the conversation so far (the last turn is the user's) and the
// current draft in, the updated draft and a reply out.
export async function draftPlanTurn(conversation: unknown, currentDraft: unknown): Promise<ActionResult<AssistantReply>> {
  await getCurrentUser();
  const turns = conversationSchema.safeParse(conversation);
  const draft = draftSchema.safeParse(currentDraft);
  if (!turns.success || !draft.success || turns.data.at(-1)?.role !== "user") return fail();

  const { active } = await listExercises();
  // The model sees short numbers instead of uuids (far fewer tokens); they map back below.
  const idByRef = new Map(active.map((e, i) => [String(i + 1), e.id]));
  const refById = new Map(active.map((e, i) => [e.id, String(i + 1)]));
  const library = active
    .map((e, i) => `${i + 1} | ${e.name_he} | ${e.name_en ?? ""} | ${e.muscle_group} | ${e.equipment}`)
    .join("\n");
  const draftForModel = {
    ...draft.data,
    exercises: draft.data.exercises.map((e) => ({ ...e, exercise_id: refById.get(e.exercise_id) ?? e.exercise_id })),
  };

  // One self-contained input: the instructions, the conversation so far, the current draft and
  // the newest message (the model edits the draft instead of starting over).
  const history = turns.data
    .slice(0, -1)
    .map((turn) => `${turn.role === "user" ? "USER" : "ASSISTANT"}: ${turn.text}`)
    .join("\n");
  const input = [
    systemPrompt(library),
    history ? `CONVERSATION SO FAR:\n${history}` : "",
    `CURRENT DRAFT: ${JSON.stringify(draftForModel)}`,
    `NEWEST USER MESSAGE: ${turns.data.at(-1)!.text}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  let raw: unknown;
  try {
    raw = await generateJson({ input, schema: responseSchema });
  } catch (error) {
    if (error instanceof GeminiError && error.kind === "not_configured") return fail(copy.notConfigured);
    console.error("plan assistant:", error instanceof Error ? error.message : error);
    return fail(copy.unavailable);
  }

  const parsed = draftResponseSchema.safeParse(raw);
  if (!parsed.success) return fail(copy.unavailable);
  const withIds = {
    ...parsed.data,
    exercises: parsed.data.exercises.map((e) => ({ ...e, exercise_id: idByRef.get(e.exercise_id.trim()) ?? e.exercise_id })),
  };
  const { draft: next } = sanitizeDraft(withIds, new Set(active.map((e) => e.id)), copy.defaultName);
  return ok({ draft: next, message: parsed.data.message.trim().slice(0, 600) || copy.fallbackMessage });
}

// Saves the draft as a new plan (template + exercises). On a failed exercise insert the empty
// template is removed again, so a half-saved plan never stays behind.
export async function saveDraftAsPlan(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success || parsed.data.exercises.length === 0) return fail();

  const supabase = await createClient();
  const template = await supabase
    .from("workout_templates")
    .insert({ user_id: user.id, name: parsed.data.name })
    .select("id")
    .single();
  if (template.error) return fail();

  const { error } = await supabase.from("template_exercises").insert(
    parsed.data.exercises.map((exercise, index) => ({ ...exercise, template_id: template.data.id, position: index + 1 })),
  );
  if (error) {
    await supabase.from("workout_templates").delete().eq("id", template.data.id);
    return fail();
  }

  revalidatePath("/plans");
  return ok({ id: template.data.id });
}
