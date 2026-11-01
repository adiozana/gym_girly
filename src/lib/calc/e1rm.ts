import type { SetValues } from "./types";

// One decimal place; never returns -0.
export function round1(n: number): number {
  const r = Math.round(n * 10) / 10;
  return r === 0 ? 0 : r;
}

// Epley estimated one-rep max. Bodyweight sets (no weight) use the reps themselves.
export function e1rm(set: SetValues): number {
  if (set.weight_kg === null || set.weight_kg === 0) return set.reps;
  return set.weight_kg * (1 + set.reps / 30);
}

// Highest e1RM wins; ties keep the earlier set. Sets with no reps are ignored.
export function bestSet<T extends SetValues>(sets: readonly T[]): T | null {
  let best: T | null = null;
  let bestValue = -Infinity;
  for (const set of sets) {
    if (set.reps <= 0) continue;
    const value = e1rm(set);
    if (value > bestValue) {
      best = set;
      bestValue = value;
    }
  }
  return best;
}

export function percentChange(current: number, baseline: number): number | null {
  if (baseline <= 0) return null;
  return round1((current / baseline - 1) * 100);
}
