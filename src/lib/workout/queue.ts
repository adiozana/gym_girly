import type { WorkoutOp } from "@/lib/validation/workout";

// The active workout's write queue (SPEC.md: "never lose data"). Pure functions only;
// the React hook drives them and sends batches to the server.
//
// Rules:
// - Every op describes the full latest state of one entity (a set or an exercise card),
//   so a newer op for the same entity replaces the pending one. It keeps the position of
//   the earliest pending op, which preserves dependencies (a card is created before its sets).
// - Deleting a card drops its pending set ops: the database deletes its sets in cascade.
// - Ops being sent ("in flight") are never merged; if they fail they return to the head.
// - Text fields are debounced by giving their op a later `readyAt`. Ops are sent strictly
//   in order, so a waiting op holds back the ones behind it (for at most the debounce).

export type QueuedOp = { op: WorkoutOp; readyAt: number };

export type QueueState = {
  pending: QueuedOp[];
  inFlight: QueuedOp[];
};

export const emptyQueue: QueueState = { pending: [], inFlight: [] };

export function opKey(op: WorkoutOp): string {
  switch (op.kind) {
    case "saveSets":
      return `sets:${op.sets.sessionExerciseId}`;
    case "upsertExercise":
      return `exercise:${op.exercise.id}`;
    case "deleteExercise":
      return `exercise:${op.id}`;
  }
}

function exerciseOfSetOp(op: WorkoutOp): string | null {
  return op.kind === "saveSets" ? op.sets.sessionExerciseId : null;
}

function addToPending(pending: readonly QueuedOp[], item: QueuedOp): QueuedOp[] {
  let next = [...pending];
  if (item.op.kind === "deleteExercise") {
    const cardId = item.op.id;
    next = next.filter((queued) => exerciseOfSetOp(queued.op) !== cardId);
  }
  const key = opKey(item.op);
  const index = next.findIndex((queued) => opKey(queued.op) === key);
  if (index === -1) next.push(item);
  else next[index] = item;
  return next;
}

export function enqueue(state: QueueState, op: WorkoutOp, readyAt: number): QueueState {
  return { ...state, pending: addToPending(state.pending, { op, readyAt }) };
}

// Takes the ready ops at the head of the queue (up to `max`) to send as one batch.
// Nothing is taken while a batch is in flight.
export function takeReady(state: QueueState, now: number, max: number): { state: QueueState; batch: WorkoutOp[] } {
  if (state.inFlight.length > 0) return { state, batch: [] };
  let count = 0;
  while (count < state.pending.length && count < max && state.pending[count].readyAt <= now) count++;
  if (count === 0) return { state, batch: [] };
  const taken = state.pending.slice(0, count);
  return {
    state: { pending: state.pending.slice(count), inFlight: taken },
    batch: taken.map((queued) => queued.op),
  };
}

// After a batch: the first `applied` ops are saved. With `dropNext`, the op after them
// failed for good (e.g. the row no longer exists) and is discarded. The rest go back to
// the head of the queue, merged with anything that was queued for them meanwhile.
export function settle(state: QueueState, applied: number, dropNext = false): QueueState {
  const returned = state.inFlight.slice(applied + (dropNext ? 1 : 0));
  const pending = state.pending.reduce(addToPending, returned);
  return { pending, inFlight: [] };
}

// Makes every op ready now (leaving the screen, or saving the workout).
export function makeAllReady(state: QueueState, now: number): QueueState {
  return {
    ...state,
    pending: state.pending.map((queued) => (queued.readyAt > now ? { ...queued, readyAt: now } : queued)),
  };
}

// The earliest time an op becomes ready, if any is waiting.
export function nextReadyAt(state: QueueState): number | null {
  return state.pending[0]?.readyAt ?? null;
}

export function pendingCount(state: QueueState): number {
  return state.pending.length + state.inFlight.length;
}

// Everything not yet saved, in order: what gets mirrored to localStorage.
export function unsavedOps(state: QueueState): WorkoutOp[] {
  return [...state.inFlight, ...state.pending].map((queued) => queued.op);
}

// Rebuilds a queue from ops restored after a reload; they are all ready at once.
export function restoreQueue(ops: readonly WorkoutOp[]): QueueState {
  return { pending: ops.reduce<QueuedOp[]>((pending, op) => addToPending(pending, { op, readyAt: 0 }), []), inFlight: [] };
}
