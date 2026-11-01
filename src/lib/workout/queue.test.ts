import { describe, expect, it } from "vitest";
import type { WorkoutOp } from "@/lib/validation/workout";
import {
  emptyQueue,
  enqueue,
  makeAllReady,
  nextReadyAt,
  opKey,
  pendingCount,
  restoreQueue,
  settle,
  takeReady,
  unsavedOps,
  type QueueState,
} from "./queue";

const CARD = "00000000-0000-4000-8000-0000000000c1";
const CARD2 = "00000000-0000-4000-8000-0000000000c2";
const SET1 = "00000000-0000-4000-8000-0000000000a1";
const SET2 = "00000000-0000-4000-8000-0000000000a2";

// A row's sets are saved as one op, keyed by the exercise (the set ids are fixed per row).
const setOp = (reps: number | null, is_done = false, card = CARD): WorkoutOp => ({
  kind: "saveSets",
  sets: { sessionExerciseId: card, setIds: [SET1, SET2], weight_kg: 50, reps, is_done },
});
const cardOp = (id: string, note = ""): WorkoutOp => ({
  kind: "upsertExercise",
  exercise: {
    id,
    exercise_id: "00000000-0000-4000-8000-000000000001",
    replaced_exercise_id: null,
    template_exercise_id: null,
    position: 1,
    note,
  },
});

const add = (state: QueueState, ops: WorkoutOp[], readyAt = 0) => ops.reduce((s, op) => enqueue(s, op, readyAt), state);

describe("write queue", () => {
  it("keeps ops in order", () => {
    const state = add(emptyQueue, [cardOp(CARD), setOp(8), setOp(6, false, CARD2)]);
    expect(unsavedOps(state).map((op) => op.kind)).toEqual(["upsertExercise", "saveSets", "saveSets"]);
  });

  it("keys sets ops by exercise", () => {
    expect(opKey(setOp(8))).toBe(`sets:${CARD}`);
    expect(opKey(setOp(8, false, CARD2))).toBe(`sets:${CARD2}`);
  });

  it("coalesces ops per entity: the latest values win, at the earliest position", () => {
    let state = add(emptyQueue, [cardOp(CARD), setOp(8), setOp(6, false, CARD2)]);
    state = enqueue(state, cardOp(CARD, "seat 4"), 0);
    state = enqueue(state, setOp(10, true), 0);
    const ops = unsavedOps(state);
    expect(ops).toHaveLength(3);
    expect(ops[0]).toEqual(cardOp(CARD, "seat 4"));
    expect(ops[1]).toEqual(setOp(10, true));
    expect(ops[2]).toEqual(setOp(6, false, CARD2));
  });

  it("drops a card's pending sets op when the card is deleted", () => {
    let state = add(emptyQueue, [cardOp(CARD), setOp(8), setOp(6, false, CARD2)]);
    state = enqueue(state, { kind: "deleteExercise", id: CARD }, 0);
    expect(unsavedOps(state)).toEqual([{ kind: "deleteExercise", id: CARD }, setOp(6, false, CARD2)]);
  });

  it("restoring a deleted card puts it back before its re-added sets", () => {
    let state = add(emptyQueue, [cardOp(CARD), setOp(8)]);
    state = enqueue(state, { kind: "deleteExercise", id: CARD }, 0);
    state = add(state, [cardOp(CARD), setOp(8)]);
    expect(unsavedOps(state)).toEqual([cardOp(CARD), setOp(8)]);
  });

  it("sends only ready ops from the head, in order", () => {
    let state = enqueue(emptyQueue, setOp(8), 1000); // debounced text field
    state = enqueue(state, setOp(6, true, CARD2), 0);
    expect(takeReady(state, 500, 10).batch).toEqual([]);
    expect(nextReadyAt(state)).toBe(1000);

    const { state: sending, batch } = takeReady(state, 1000, 10);
    expect(batch).toEqual([setOp(8), setOp(6, true, CARD2)]);
    expect(sending.pending).toEqual([]);
    expect(pendingCount(sending)).toBe(2);
  });

  it("limits the batch size and takes nothing while a batch is in flight", () => {
    const state = add(emptyQueue, [setOp(8), setOp(6, false, CARD2)]);
    const first = takeReady(state, 0, 1);
    expect(first.batch).toEqual([setOp(8)]);
    expect(takeReady(first.state, 0, 10).batch).toEqual([]);
  });

  it("never merges into an op in flight; a newer op waits behind it", () => {
    let state = add(emptyQueue, [setOp(8)]);
    ({ state } = takeReady(state, 0, 10));
    state = enqueue(state, setOp(9), 0);
    expect(unsavedOps(state)).toEqual([setOp(8), setOp(9)]);
    state = settle(state, 1);
    expect(unsavedOps(state)).toEqual([setOp(9)]);
  });

  it("on failure returns unsent ops to the head, merged with newer ops", () => {
    let state = add(emptyQueue, [cardOp(CARD), setOp(8), setOp(6, false, CARD2)]);
    ({ state } = takeReady(state, 0, 10));
    state = enqueue(state, setOp(7, false, CARD2), 0);
    state = enqueue(state, cardOp(CARD2), 0);
    // The first op was saved, then the connection dropped.
    state = settle(state, 1);
    expect(unsavedOps(state)).toEqual([setOp(8), setOp(7, false, CARD2), cardOp(CARD2)]);
    expect(state.inFlight).toEqual([]);
  });

  it("drops an op that failed for good and keeps the rest", () => {
    let state = add(emptyQueue, [setOp(8), setOp(6, false, CARD2)]);
    ({ state } = takeReady(state, 0, 10));
    state = settle(state, 0, true);
    expect(unsavedOps(state)).toEqual([setOp(6, false, CARD2)]);
  });

  it("drops returned sets ops when their card was deleted meanwhile", () => {
    let state = add(emptyQueue, [setOp(8)]);
    ({ state } = takeReady(state, 0, 10));
    state = enqueue(state, { kind: "deleteExercise", id: CARD }, 0);
    state = settle(state, 0);
    expect(unsavedOps(state)).toEqual([{ kind: "deleteExercise", id: CARD }]);
  });

  it("is empty after everything is saved", () => {
    let state = add(emptyQueue, [setOp(8), setOp(6, false, CARD2)]);
    ({ state } = takeReady(state, 0, 10));
    state = settle(state, 2);
    expect(pendingCount(state)).toBe(0);
    expect(nextReadyAt(state)).toBeNull();
  });

  it("makes waiting ops ready at once when flushing", () => {
    const state = makeAllReady(enqueue(emptyQueue, setOp(8), 5000), 100);
    expect(takeReady(state, 100, 10).batch).toEqual([setOp(8)]);
  });

  it("restores a mirrored queue as ready ops", () => {
    const state = restoreQueue([setOp(8), setOp(9), cardOp(CARD)]);
    expect(unsavedOps(state)).toEqual([setOp(9), cardOp(CARD)]);
    expect(takeReady(state, 0, 10).batch).toHaveLength(2);
  });
});
