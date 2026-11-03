import { getDay, parseISO } from "date-fns";
import { goalForDate } from "@/lib/calc";
import type { StoredGoal } from "./queries";

// The plan assigned to this date by the goal in effect (fixed weekdays only), if any.
export function plannedTemplateFor(goals: readonly StoredGoal[], date: string): { id: string; name: string } | null {
  const goal = goalForDate(date, goals) as StoredGoal | null;
  if (!goal || goal.type !== "fixed_days") return null;
  const weekday = getDay(parseISO(date));
  if (!goal.training_weekdays.includes(weekday)) return null;
  const day = goal.dayTemplates.find((d) => d.weekday === weekday);
  return day ? { id: day.templateId, name: day.templateName } : null;
}

// The goal that applies from today on (the one without an end date).
export function activeGoal(goals: readonly StoredGoal[]): StoredGoal | null {
  return goals.find((goal) => goal.end_date === null) ?? null;
}
