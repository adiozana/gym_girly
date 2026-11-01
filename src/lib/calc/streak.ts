import { addDays, format, parseISO, subDays } from "date-fns";
import { getDayStatus, isCompliant, type Goal } from "./day-status";
import type { ISODate } from "./types";

const fmt = (d: Date): ISODate => format(d, "yyyy-MM-dd");

export function currentStreak(
  goals: readonly Goal[],
  completedSessionDates: ReadonlySet<ISODate>,
  today: ISODate,
): number {
  let day = parseISO(today);
  if (getDayStatus(today, goals, completedSessionDates, today) === "pending") day = subDays(day, 1);
  let count = 0;
  // Stops at the first non-compliant day (missed or no_goal), so it never scans before the goal.
  for (;;) {
    const status = getDayStatus(fmt(day), goals, completedSessionDates, today);
    if (!isCompliant(status)) return count;
    count += 1;
    day = subDays(day, 1);
  }
}

export function longestStreak(
  goals: readonly Goal[],
  completedSessionDates: ReadonlySet<ISODate>,
  today: ISODate,
): number {
  if (goals.length === 0) return 0;
  const first = goals.reduce((min, g) => (g.start_date < min ? g.start_date : min), goals[0].start_date);
  let longest = 0;
  let run = 0;
  for (let day = parseISO(first); fmt(day) <= today; day = addDays(day, 1)) {
    const status = getDayStatus(fmt(day), goals, completedSessionDates, today);
    if (isCompliant(status)) {
      run += 1;
      if (run > longest) longest = run;
    } else if (status !== "pending") {
      run = 0;
    }
  }
  return longest;
}
