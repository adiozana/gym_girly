import type { PreviousPerformance } from "@/lib/calc";

// A row of the previous_performance RPC: one done set of the latest completed session
// where the exercise was performed.
export type PreviousRow = {
  exercise_id: string;
  session_id: string;
  started_at: string;
  note: string | null;
  set_number: number;
  weight_kg: number | null;
  reps: number;
};

// Shapes previous_performance rows (done sets of the latest completed session per exercise)
// into one PreviousPerformance per exercise id.
export function groupPreviousPerformance(rows: readonly PreviousRow[]): Map<string, PreviousPerformance> {
  const result = new Map<string, PreviousPerformance>();
  for (const row of rows) {
    let entry = result.get(row.exercise_id);
    if (!entry) {
      entry = { sessionId: row.session_id, startedAt: row.started_at, note: row.note ?? null, sets: [] };
      result.set(row.exercise_id, entry);
    }
    entry.sets.push({
      set_number: row.set_number,
      weight_kg: row.weight_kg == null ? null : Number(row.weight_kg),
      reps: row.reps,
    });
  }
  for (const entry of result.values()) entry.sets.sort((a, b) => a.set_number - b.set_number);
  return result;
}
