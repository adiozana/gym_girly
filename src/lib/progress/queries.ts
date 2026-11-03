import "server-only";
import type { ProgressSession } from "@/lib/calc";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type ProgressPlan = {
  id: string;
  name: string;
  // Completed workouts of this plan, oldest first (the range is cut on the device).
  sessions: ProgressSession[];
};

// Data for the progress chart (SPEC.md "גרף התקדמות לכל תוכנית"): every active plan with its
// completed workouts and their done sets. Plans most recently trained come first, so the
// first tab is the default.
export async function getProgressData(): Promise<ProgressPlan[]> {
  await getCurrentUser();
  const supabase = await createClient();
  const [plans, sessions] = await Promise.all([
    supabase.from("workout_templates").select("id, name, created_at").eq("is_archived", false).order("created_at"),
    supabase
      .from("workout_sessions")
      .select(
        `id, template_id, session_date, started_at,
         session_exercises (
           position,
           exercise:exercises!session_exercises_exercise_id_fkey (id, name_he),
           session_sets (weight_kg, reps, is_done)
         )`,
      )
      .eq("status", "completed")
      .not("template_id", "is", null)
      .order("started_at"),
  ]);
  if (plans.error) throw plans.error;
  if (sessions.error) throw sessions.error;

  const byPlan = new Map<string, ProgressSession[]>();
  const lastTrained = new Map<string, string>();
  for (const session of sessions.data) {
    if (!session.template_id) continue;
    const entry: ProgressSession = {
      sessionId: session.id,
      date: session.session_date,
      startedAt: session.started_at,
      exercises: session.session_exercises
        .sort((a, b) => a.position - b.position)
        .map((se) => ({
          exerciseId: se.exercise.id,
          name: se.exercise.name_he,
          sets: se.session_sets
            .filter((set) => set.is_done && set.reps != null)
            .map((set) => ({ weight_kg: set.weight_kg == null ? null : Number(set.weight_kg), reps: set.reps ?? 0 })),
        }))
        .filter((exercise) => exercise.sets.length > 0),
    };
    byPlan.set(session.template_id, [...(byPlan.get(session.template_id) ?? []), entry]);
    lastTrained.set(session.template_id, session.started_at);
  }

  return plans.data
    .map((plan) => ({ id: plan.id, name: plan.name, sessions: byPlan.get(plan.id) ?? [] }))
    .sort((a, b) => (lastTrained.get(b.id) ?? "").localeCompare(lastTrained.get(a.id) ?? ""));
}
