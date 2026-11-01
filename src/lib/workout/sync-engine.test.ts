import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkoutOp } from "@/lib/validation/workout";
import { emptyQueue, restoreQueue } from "./queue";
import { createSyncEngine, TEXT_DEBOUNCE_MS, type SendResult } from "./sync-engine";

// n picks the exercise row, so different n are different entities in the queue.
const setOp = (n: number, reps: number): WorkoutOp => ({
  kind: "saveSets",
  sets: {
    sessionExerciseId: `00000000-0000-4000-8000-0000000000c${n}`,
    setIds: [`00000000-0000-4000-8000-00000000000${n}`],
    weight_kg: 50,
    reps,
    is_done: false,
  },
});

function setup(responses: (SendResult | Error)[] = [], initialQueue = emptyQueue) {
  const sent: WorkoutOp[][] = [];
  const mirrored: WorkoutOp[][] = [];
  const send = vi.fn(async (ops: WorkoutOp[]) => {
    sent.push(ops);
    const next = responses.shift() ?? { applied: ops.length, failure: null };
    if (next instanceof Error) throw next;
    return next;
  });
  const onDropped = vi.fn();
  const engine = createSyncEngine({ initialQueue, send, onDropped, onChange: (ops) => mirrored.push(ops) });
  return { engine, sent, mirrored, send, onDropped };
}

describe("sync engine", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("sends immediate ops at once and reports saved", async () => {
    const { engine, sent } = setup();
    engine.enqueue(setOp(1, 8));
    expect(engine.getStatus()).toBe("saving");
    await vi.runAllTimersAsync();
    expect(sent).toEqual([[setOp(1, 8)]]);
    expect(engine.getStatus()).toBe("saved");
  });

  it("debounces text edits and sends only the latest value", async () => {
    const { engine, sent } = setup();
    engine.enqueue(setOp(1, 1), { debounce: true });
    await vi.advanceTimersByTimeAsync(200);
    engine.enqueue(setOp(1, 12), { debounce: true });
    await vi.advanceTimersByTimeAsync(TEXT_DEBOUNCE_MS - 1);
    expect(sent).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(sent).toEqual([[setOp(1, 12)]]);
  });

  it("mirrors unsaved ops on every change and ends empty", async () => {
    const { engine, mirrored } = setup();
    engine.enqueue(setOp(1, 8));
    expect(mirrored[0]).toEqual([setOp(1, 8)]);
    await vi.runAllTimersAsync();
    expect(mirrored.at(-1)).toEqual([]);
  });

  it("keeps ops after a failure, shows it, and retries with backoff", async () => {
    const { engine, sent } = setup([new Error("offline")]);
    engine.enqueue(setOp(1, 8));
    await vi.advanceTimersByTimeAsync(0);
    expect(engine.getStatus()).toBe("failed");
    expect(sent).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual([setOp(1, 8)]);
    expect(engine.getStatus()).toBe("saved");
  });

  it("retries at once when asked (e.g. the connection is back)", async () => {
    const { engine, sent } = setup([{ applied: 0, failure: "transient" }]);
    engine.enqueue(setOp(1, 8));
    await vi.advanceTimersByTimeAsync(0);
    engine.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toHaveLength(2);
    expect(engine.getStatus()).toBe("saved");
  });

  it("resends only what wasn't applied", async () => {
    const { engine, sent } = setup([{ applied: 1, failure: "transient" }], restoreQueue([setOp(1, 8), setOp(2, 6)]));
    engine.attach();
    await vi.advanceTimersByTimeAsync(0);
    expect(engine.getStatus()).toBe("failed");
    engine.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toEqual([[setOp(1, 8), setOp(2, 6)], [setOp(2, 6)]]);
    expect(engine.getStatus()).toBe("saved");
  });

  it("drops an op that can never succeed and continues", async () => {
    const { engine, sent, onDropped } = setup([{ applied: 0, failure: "permanent" }], restoreQueue([setOp(1, 8), setOp(2, 6)]));
    engine.attach();
    await vi.runAllTimersAsync();
    expect(onDropped).toHaveBeenCalledOnce();
    expect(sent).toEqual([[setOp(1, 8), setOp(2, 6)], [setOp(2, 6)]]);
    expect(engine.getStatus()).toBe("saved");
  });

  it("flush sends waiting text edits at once and resolves when all is saved", async () => {
    const { engine, sent } = setup();
    engine.enqueue(setOp(1, 8), { debounce: true });
    const flushed = engine.flush();
    await vi.advanceTimersByTimeAsync(0);
    await expect(flushed).resolves.toBe(true);
    expect(sent).toEqual([[setOp(1, 8)]]);
  });

  it("flush resolves false when the send fails", async () => {
    const { engine } = setup([new Error("offline")]);
    engine.enqueue(setOp(1, 8), { debounce: true });
    const flushed = engine.flush();
    await vi.advanceTimersByTimeAsync(0);
    await expect(flushed).resolves.toBe(false);
  });

  it("replays ops restored from storage when attached", async () => {
    const { engine, sent } = setup([], restoreQueue([setOp(1, 8), setOp(2, 6)]));
    expect(engine.getStatus()).toBe("saving");
    engine.attach();
    await vi.runAllTimersAsync();
    expect(sent).toEqual([[setOp(1, 8), setOp(2, 6)]]);
  });

  it("sends nothing after stop, until resumed", async () => {
    const { engine, sent } = setup();
    engine.stop();
    engine.enqueue(setOp(1, 8));
    await vi.runAllTimersAsync();
    expect(sent).toEqual([]);
    engine.resume();
    await vi.runAllTimersAsync();
    expect(sent).toHaveLength(1);
  });

  it("after detach, a failed send isn't retried", async () => {
    const { engine, sent } = setup([new Error("offline")]);
    engine.enqueue(setOp(1, 8), { debounce: true });
    engine.detach();
    await vi.runAllTimersAsync();
    expect(sent).toHaveLength(1);
  });
});
