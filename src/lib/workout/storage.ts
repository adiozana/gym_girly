import { workoutOpSchema, type WorkoutOp } from "@/lib/validation/workout";
import type { WorkoutCard } from "./types";

// Unsaved work of the active workout, mirrored to localStorage so a refresh, a closed tab or
// a lost connection never loses it (SPEC.md "לא מאבדים נתונים"). It holds the ops still to
// send and the screen's state at that moment; it exists only while something is unsaved.

const VERSION = 2;
const PREFIX = "gym-girly:workout:";

export type WorkoutDraft = { ops: WorkoutOp[]; cards: WorkoutCard[] };

const keyFor = (sessionId: string) => `${PREFIX}${sessionId}`;

export function loadDraft(sessionId: string): WorkoutDraft | null {
  try {
    const raw = window.localStorage.getItem(keyFor(sessionId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { v, ops, cards } = parsed as { v?: unknown; ops?: unknown; cards?: unknown };
    if (v !== VERSION || !Array.isArray(ops) || !Array.isArray(cards)) return null;

    const validOps = ops.flatMap((op) => {
      const result = workoutOpSchema.safeParse(op);
      return result.success ? [op as WorkoutOp] : [];
    });
    if (validOps.length === 0) return null;
    return { ops: validOps, cards: cards as WorkoutCard[] };
  } catch {
    // Storage unavailable (private mode, quota) or corrupt: start from the server's data.
    return null;
  }
}

export function saveDraft(sessionId: string, draft: WorkoutDraft): void {
  try {
    if (draft.ops.length === 0) window.localStorage.removeItem(keyFor(sessionId));
    else window.localStorage.setItem(keyFor(sessionId), JSON.stringify({ v: VERSION, ...draft }));
  } catch {
    // Best effort: the in-memory queue still retries.
  }
}

export function clearDraft(sessionId: string): void {
  try {
    window.localStorage.removeItem(keyFor(sessionId));
  } catch {
    // Nothing to clear.
  }
}
