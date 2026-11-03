"use server";

import { revalidatePath } from "next/cache";
import { evaluateChallenge } from "@/lib/calc";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions/result";
import { getCurrentUser } from "@/lib/auth/session";
import { strings } from "@/lib/strings";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation/common";
import { challengeWeeksSchema, goalInputSchema, localDateSchema } from "@/lib/validation/goals";
import { getGoalData } from "./queries";

function revalidateGoalViews() {
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/settings");
}

// Replaces the goal from today (SPEC.md "שינוי מטרה"): the old one ends yesterday.
export async function saveGoal(input: unknown, today: unknown): Promise<ActionResult> {
  await getCurrentUser();
  const parsed = goalInputSchema.safeParse(input);
  const date = localDateSchema.safeParse(today);
  if (!date.success) return fail();
  if (!parsed.success) return invalid(parsed.error);

  const goal = parsed.data;
  const supabase = await createClient();
  // The generated types mark the optional arguments as non-null; null means "not used by this type".
  const args = {
    p_type: goal.type,
    p_training_weekdays: goal.type === "fixed_days" ? goal.training_weekdays : null,
    p_cycle_on: goal.type === "cycle" ? goal.cycle_on : null,
    p_cycle_off: goal.type === "cycle" ? goal.cycle_off : null,
    p_day_templates: goal.type === "fixed_days" ? goal.day_templates : null,
    p_today: date.data,
  } as unknown as {
    p_type: "fixed_days" | "cycle";
    p_training_weekdays: number[];
    p_cycle_on: number;
    p_cycle_off: number;
    p_day_templates: Record<string, string>;
    p_today: string;
  };
  const { error } = await supabase.rpc("set_goal", args);
  if (error) return fail();

  revalidateGoalViews();
  return ok(null);
}

export async function startChallenge(weeks: unknown, today: unknown): Promise<ActionResult> {
  await getCurrentUser();
  const parsedWeeks = challengeWeeksSchema.safeParse(weeks);
  const date = localDateSchema.safeParse(today);
  if (!parsedWeeks.success || !date.success) return fail();

  const supabase = await createClient();
  const { error } = await supabase.rpc("start_challenge", { p_weeks: parsedWeeks.data, p_today: date.data });
  if (error?.code === "P0002") return fail(strings.dashboard.challenge.needsGoal);
  if (error) return fail();

  revalidateGoalViews();
  return ok(null);
}

// Cancelling an active challenge records it as failed (SPEC.md "אתגר").
export async function cancelChallenge(id: unknown, today: unknown): Promise<ActionResult> {
  await getCurrentUser();
  const challengeId = idSchema.safeParse(id);
  const date = localDateSchema.safeParse(today);
  if (!challengeId.success || !date.success) return fail();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenges")
    .update({ status: "failed", ended_at: date.data })
    .eq("id", challengeId.data)
    .eq("status", "active")
    .select("id");
  if (error || data.length === 0) return fail();

  revalidateGoalViews();
  return ok(null);
}

// Records the result of the active challenge once it has ended (SPEC.md: evaluated when the
// dashboard loads). The server re-evaluates from its own data; only "today" comes from the device.
export async function settleChallenge(id: unknown, today: unknown): Promise<ActionResult<{ status: string }>> {
  await getCurrentUser();
  const challengeId = idSchema.safeParse(id);
  const date = localDateSchema.safeParse(today);
  if (!challengeId.success || !date.success) return fail();

  const data = await getGoalData();
  const challenge = data.challenges.find((c) => c.id === challengeId.data && c.status === "active");
  if (!challenge) return fail();

  const result = evaluateChallenge(challenge, data.goals, new Set(data.completedDates), date.data);
  if (result.status === "active") return ok({ status: "active" });

  const endedAt = result.status === "failed" ? (result.failedOn ?? date.data) : result.endDate;
  const supabase = await createClient();
  const { error } = await supabase
    .from("challenges")
    .update({ status: result.status, ended_at: endedAt })
    .eq("id", challenge.id)
    .eq("status", "active");
  if (error) return fail();

  revalidateGoalViews();
  return ok({ status: result.status });
}
