import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { getDayStatus, isCompliant, type Goal } from "./day-status";
import type { ISODate } from "./types";

export type ChallengeInput = { weeks: number; start_date: ISODate };

export type ChallengeEvaluation = {
  status: "active" | "succeeded" | "failed";
  endDate: ISODate;
  totalDays: number;
  daysElapsed: number;
  weeksCompleted: number;
  failedOn: ISODate | null;
};

export function evaluateChallenge(
  challenge: ChallengeInput,
  goals: readonly Goal[],
  completedSessionDates: ReadonlySet<ISODate>,
  today: ISODate,
): ChallengeEvaluation {
  const start = parseISO(challenge.start_date);
  const totalDays = challenge.weeks * 7;
  const endDate = format(addDays(start, totalDays - 1), "yyyy-MM-dd");

  const dayAt = (i: number): ISODate => format(addDays(start, i), "yyyy-MM-dd");
  const statuses = Array.from({ length: totalDays }, (_, i) => {
    const date = dayAt(i);
    return date > today ? null : getDayStatus(date, goals, completedSessionDates, today);
  });

  let failedOn: ISODate | null = null;
  for (let i = 0; i < totalDays; i++) {
    const s = statuses[i];
    if (s === "missed" || s === "no_goal") {
      failedOn = dayAt(i);
      break;
    }
  }

  const daysElapsed = Math.max(0, Math.min(totalDays, differenceInCalendarDays(parseISO(today), start)));

  let weeksCompleted = 0;
  for (let w = 0; w < challenge.weeks; w++) {
    if ((w + 1) * 7 > daysElapsed) break;
    const block = statuses.slice(w * 7, w * 7 + 7);
    if (!block.every((s) => s !== null && isCompliant(s))) break;
    weeksCompleted += 1;
  }

  let status: ChallengeEvaluation["status"] = "active";
  if (failedOn) status = "failed";
  else if (today > endDate) status = "succeeded";

  return { status, endDate, totalDays, daysElapsed, weeksCompleted, failedOn };
}
