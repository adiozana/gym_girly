import { bestSet, percentChange, e1rm, round1 } from "./e1rm";

export type SummarySet = { weight_kg: number | null; reps: number };

export type SummaryInput = {
  startedAt: string;
  completedAt: string;
  // Done sets of this session, in screen order.
  exercises: { exerciseId: string; name: string; sets: SummarySet[] }[];
  // exerciseId -> done sets of the last completed session before this one (missing = first time).
  previous: ReadonlyMap<string, SummarySet[]>;
};

export type ExerciseComparison = {
  exerciseId: string;
  name: string;
  today: SummarySet | null;
  previous: SummarySet | null;
  change: number | null;
  trend: "up" | "down" | "same" | "first";
};

export type WorkoutSummary = {
  durationMinutes: number;
  exerciseCount: number;
  setCount: number;
  volumeKg: number;
  exercises: ExerciseComparison[];
};

function compare(
  exerciseId: string,
  name: string,
  sets: SummarySet[],
  previousSets: SummarySet[] | undefined,
): ExerciseComparison {
  const today = bestSet(sets);
  const previous = previousSets ? bestSet(previousSets) : null;
  const change = today && previous ? percentChange(e1rm(today), e1rm(previous)) : null;
  const trend: ExerciseComparison["trend"] =
    change === null ? "first" : change === 0 ? "same" : change > 0 ? "up" : "down";
  return { exerciseId, name, today, previous, change, trend };
}

export function summarizeWorkout(input: SummaryInput): WorkoutSummary {
  const ms = new Date(input.completedAt).getTime() - new Date(input.startedAt).getTime();
  const durationMinutes = Math.max(0, Math.round(ms / 60000)) || 0;

  const merged = new Map<string, { name: string; sets: SummarySet[] }>();
  for (const ex of input.exercises) {
    const existing = merged.get(ex.exerciseId);
    if (existing) existing.sets.push(...ex.sets);
    else merged.set(ex.exerciseId, { name: ex.name, sets: [...ex.sets] });
  }

  let setCount = 0;
  let volume = 0;
  for (const { sets } of merged.values()) {
    setCount += sets.length;
    for (const s of sets) volume += (s.weight_kg ?? 0) * s.reps;
  }

  return {
    durationMinutes,
    exerciseCount: [...merged.values()].filter((e) => e.sets.length > 0).length,
    setCount,
    volumeKg: round1(volume),
    exercises: [...merged.entries()].map(([id, e]) => compare(id, e.name, e.sets, input.previous.get(id))),
  };
}
