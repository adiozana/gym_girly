import { format, parseISO, subMonths } from "date-fns";
import { bestSet, e1rm, percentChange, round1 } from "./e1rm";
import type { ISODate, SetValues } from "./types";

export type ProgressSession = {
  sessionId: string;
  date: ISODate;
  startedAt: string;
  exercises: { exerciseId: string; name: string; sets: SetValues[] }[];
};

export type ProgressRange = "month" | "3months" | "all";

export type ProgressPoint = { sessionId: string; date: ISODate; value: number };

type BestSet = { weight_kg: number | null; reps: number; date: ISODate };

export type ProgressExerciseRow = {
  exerciseId: string;
  name: string;
  first: BestSet;
  last: BestSet | null;
  change: number | null;
  firstTime: boolean;
};

export type ProgressResult = {
  points: ProgressPoint[];
  exercises: ProgressExerciseRow[];
  headline: number | null;
  sinceDate: ISODate | null;
  enoughData: boolean;
};

export function rangeStart(range: ProgressRange, today: ISODate): ISODate | null {
  if (range === "all") return null;
  return format(subMonths(parseISO(today), range === "month" ? 1 : 3), "yyyy-MM-dd");
}

// Max e1RM over the sets, and the best set itself (null when no valid set).
function exerciseValue(sets: readonly SetValues[]): { value: number; best: SetValues } | null {
  const best = bestSet(sets);
  return best ? { value: e1rm(best), best } : null;
}

export function computeProgress(input: readonly ProgressSession[]): ProgressResult {
  const sessions = [...input].sort(
    (a, b) => a.date.localeCompare(b.date) || a.startedAt.localeCompare(b.startedAt),
  );

  type State = {
    row: ProgressExerciseRow;
    baseline: number;
    lastValue: number;
    count: number;
  };
  const states = new Map<string, State>();
  const points: ProgressPoint[] = [];

  for (const session of sessions) {
    // Merge duplicates of the same exercise within one session.
    const merged = new Map<string, { name: string; sets: SetValues[] }>();
    for (const ex of session.exercises) {
      const existing = merged.get(ex.exerciseId);
      if (existing) existing.sets.push(...ex.sets);
      else merged.set(ex.exerciseId, { name: ex.name, sets: [...ex.sets] });
    }

    const changes: number[] = [];
    for (const [exerciseId, ex] of merged) {
      const result = exerciseValue(ex.sets);
      if (!result) continue;
      const { value, best } = result;
      const snapshot: BestSet = { weight_kg: best.weight_kg, reps: best.reps, date: session.date };
      const state = states.get(exerciseId);
      if (!state) {
        states.set(exerciseId, {
          row: { exerciseId, name: ex.name, first: snapshot, last: null, change: null, firstTime: true },
          baseline: value,
          lastValue: value,
          count: 1,
        });
        continue;
      }
      state.count += 1;
      state.lastValue = value;
      state.row.last = snapshot;
      state.row.firstTime = false;
      state.row.change = percentChange(value, state.baseline);
      if (state.baseline > 0) changes.push((value / state.baseline - 1) * 100);
    }

    const value =
      points.length === 0 || changes.length === 0
        ? 0
        : round1(changes.reduce((sum, c) => sum + c, 0) / changes.length);
    points.push({ sessionId: session.sessionId, date: session.date, value });
  }

  return {
    points,
    exercises: [...states.values()].map((s) => s.row),
    headline: points.length > 0 ? points[points.length - 1].value : null,
    sinceDate: sessions.length > 0 ? sessions[0].date : null,
    enoughData: sessions.length >= 2,
  };
}
