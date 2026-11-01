import { differenceInCalendarDays, getDay, parseISO } from "date-fns";
import type { ISODate } from "./types";

export type Goal =
  | { type: "fixed_days"; training_weekdays: number[]; start_date: ISODate; end_date: ISODate | null }
  | { type: "cycle"; cycle_on: number; cycle_off: number; start_date: ISODate; end_date: ISODate | null };

export type DayStatus =
  | "no_goal"
  | "trained"
  | "rest"
  | "missed"
  | "pending"
  | "planned_training"
  | "planned_rest";

// "yyyy-MM-dd" strings compare correctly as text.
export function goalForDate(date: ISODate, goals: readonly Goal[]): Goal | null {
  return (
    goals.find((g) => g.start_date <= date && (g.end_date === null || date <= g.end_date)) ?? null
  );
}

export function isTrainingDay(goal: Goal, date: ISODate): boolean {
  if (goal.type === "fixed_days") {
    return goal.training_weekdays.includes(getDay(parseISO(date)));
  }
  const period = goal.cycle_on + goal.cycle_off;
  if (period <= 0) return false;
  const days = differenceInCalendarDays(parseISO(date), parseISO(goal.start_date));
  return days % period < goal.cycle_on;
}

export function getDayStatus(
  date: ISODate,
  goals: readonly Goal[],
  completedSessionDates: ReadonlySet<ISODate>,
  today: ISODate,
): DayStatus {
  const goal = goalForDate(date, goals);
  if (!goal) return "no_goal";
  const training = isTrainingDay(goal, date);
  if (date > today) return training ? "planned_training" : "planned_rest";
  if (!training) return "rest";
  if (completedSessionDates.has(date)) return "trained";
  return date < today ? "missed" : "pending";
}

export function isCompliant(status: DayStatus): boolean {
  return status === "trained" || status === "rest";
}
