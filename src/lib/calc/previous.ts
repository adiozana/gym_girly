export type HistoryEntry = {
  sessionId: string;
  status: "in_progress" | "completed";
  startedAt: string;
  position: number;
  note: string | null;
  sets: { set_number: number; weight_kg: number | null; reps: number | null; is_done: boolean }[];
};

export type PreviousPerformance = {
  sessionId: string;
  startedAt: string;
  note: string | null;
  sets: { set_number: number; weight_kg: number | null; reps: number }[];
};

// Entries are all for one exercise_id, so alternatives have their own history.
export function findPreviousPerformance(
  entries: readonly HistoryEntry[],
  excludeSessionId?: string,
): PreviousPerformance | null {
  let chosen: HistoryEntry | null = null;
  for (const entry of entries) {
    if (entry.status !== "completed" || entry.sessionId === excludeSessionId) continue;
    if (
      chosen === null ||
      entry.startedAt > chosen.startedAt ||
      (entry.sessionId === chosen.sessionId && entry.position < chosen.position)
    ) {
      chosen = entry;
    }
  }
  if (!chosen) return null;

  const sets: PreviousPerformance["sets"] = [];
  for (const s of chosen.sets) {
    if (s.is_done && s.reps !== null) {
      sets.push({ set_number: s.set_number, weight_kg: s.weight_kg, reps: s.reps });
    }
  }
  if (sets.length === 0) return null;
  sets.sort((a, b) => a.set_number - b.set_number);
  return { sessionId: chosen.sessionId, startedAt: chosen.startedAt, note: chosen.note, sets };
}

// Matches by set number: set 2 now is prefilled from set 2 last time.
export function suggestionForSet(
  previous: PreviousPerformance | null,
  setNumber: number,
): { weight_kg: number | null; reps: number } | null {
  const match = previous?.sets.find((s) => s.set_number === setNumber);
  return match ? { weight_kg: match.weight_kg, reps: match.reps } : null;
}
