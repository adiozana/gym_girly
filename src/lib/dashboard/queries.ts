import "server-only";
import type { Goal } from "@/lib/calc";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// A goal as stored, with its weekday plans (fixed_days only).
export type StoredGoal = Goal & {
  id: string;
  dayTemplates: { weekday: number; templateId: string; templateName: string }[];
};

export type ChallengeRow = {
  id: string;
  weeks: number;
  start_date: string;
  status: "active" | "succeeded" | "failed";
  ended_at: string | null;
};

export type CalendarSession = { id: string; date: string; name: string | null };

// Raw data for everything that depends on "today". The browser computes day statuses, the streak
// and the challenge, because days follow the device's time zone (SPEC.md).
export type GoalData = {
  goals: StoredGoal[];
  // Dates with at least one completed workout (all time: the longest streak needs them).
  completedDates: string[];
  sessions: CalendarSession[];
  challenges: ChallengeRow[];
};

export async function getGoalData(): Promise<GoalData> {
  await getCurrentUser();
  const supabase = await createClient();
  const [goals, sessions, challenges] = await Promise.all([
    supabase
      .from("goals")
      .select(
        `id, type, training_weekdays, cycle_on, cycle_off, start_date, end_date,
         goal_day_templates (weekday, template:workout_templates (id, name))`,
      )
      .order("start_date"),
    supabase
      .from("workout_sessions")
      .select("id, session_date, template_name")
      .eq("status", "completed")
      .order("started_at"),
    supabase
      .from("challenges")
      .select("id, weeks, start_date, status, ended_at")
      .order("start_date", { ascending: false }),
  ]);
  if (goals.error) throw goals.error;
  if (sessions.error) throw sessions.error;
  if (challenges.error) throw challenges.error;

  return {
    goals: goals.data.map((row): StoredGoal => {
      const dayTemplates = row.goal_day_templates.map((d) => ({
        weekday: d.weekday,
        templateId: d.template.id,
        templateName: d.template.name,
      }));
      return row.type === "fixed_days"
        ? {
            id: row.id,
            type: "fixed_days",
            training_weekdays: row.training_weekdays ?? [],
            start_date: row.start_date,
            end_date: row.end_date,
            dayTemplates,
          }
        : {
            id: row.id,
            type: "cycle",
            cycle_on: row.cycle_on ?? 1,
            cycle_off: row.cycle_off ?? 0,
            start_date: row.start_date,
            end_date: row.end_date,
            dayTemplates,
          };
    }),
    completedDates: [...new Set(sessions.data.map((s) => s.session_date))],
    sessions: sessions.data.map((s) => ({ id: s.id, date: s.session_date, name: s.template_name })),
    challenges: challenges.data,
  };
}
