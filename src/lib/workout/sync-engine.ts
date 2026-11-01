import { MAX_OPS_PER_BATCH, type WorkoutOp } from "@/lib/validation/workout";
import {
  enqueue as enqueueOp,
  makeAllReady,
  nextReadyAt,
  pendingCount,
  settle,
  takeReady,
  unsavedOps,
  type QueueState,
} from "./queue";

// Drives the pure write queue (./queue.ts): sends ready ops in batches, one batch at a
// time, retries with backoff, and lets the screen flush before saving or leaving.
// Framework-free (the hook in ./use-workout-sync.ts is the React glue), so it's testable.

export const TEXT_DEBOUNCE_MS = 500;
const MAX_BACKOFF_MS = 30_000;

export type SyncStatus = "saved" | "saving" | "failed";

export type SendResult = { applied: number; failure: "transient" | "permanent" | null };

type EngineOptions = {
  initialQueue: QueueState;
  // Sends a batch; throwing counts as a transient failure (e.g. offline).
  send: (ops: WorkoutOp[]) => Promise<SendResult>;
  // An op that can never succeed was dropped (e.g. its row was deleted elsewhere).
  onDropped: () => void;
  // After every queue change, with everything still unsaved (to mirror it to storage).
  onChange: (ops: WorkoutOp[]) => void;
  now?: () => number;
};

const backoff = (failures: number) => Math.min(MAX_BACKOFF_MS, 1000 * 2 ** (failures - 1));

export function createSyncEngine({ initialQueue, send, onDropped, onChange, now = Date.now }: EngineOptions) {
  let queue = initialQueue;
  let status: SyncStatus = pendingCount(initialQueue) > 0 ? "saving" : "saved";
  let sending = false;
  let stopped = false;
  // After the screen is gone: one last send, no more retries (storage keeps the rest).
  let detached = false;
  let failures = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let waiters: ((saved: boolean) => void)[] = [];
  const listeners = new Set<() => void>();

  function setStatus(next: SyncStatus) {
    if (status === next) return;
    status = next;
    for (const listener of listeners) listener();
  }

  function update(next: QueueState) {
    queue = next;
    onChange(unsavedOps(next));
  }

  function resolveWaiters(saved: boolean) {
    const pending = waiters;
    waiters = [];
    for (const resolve of pending) resolve(saved);
  }

  async function pump(): Promise<void> {
    if (sending || stopped) return;
    clearTimeout(timer);

    const at = now();
    const { state, batch } = takeReady(queue, at, MAX_OPS_PER_BATCH);
    if (batch.length === 0) {
      const readyAt = nextReadyAt(queue);
      if (readyAt !== null) {
        timer = setTimeout(() => void pump(), Math.max(0, readyAt - at));
      } else {
        failures = 0;
        setStatus("saved");
        resolveWaiters(true);
      }
      return;
    }

    sending = true;
    update(state);
    if (failures === 0) setStatus("saving");

    let result: SendResult = { applied: 0, failure: "transient" };
    try {
      result = await send(batch);
    } catch {
      // Network error or the server is unreachable: keep everything and retry.
    }
    sending = false;
    update(settle(queue, result.applied, result.failure === "permanent"));
    if (stopped) return;

    if (result.failure === "transient") {
      failures += 1;
      setStatus("failed");
      resolveWaiters(false);
      if (!detached) timer = setTimeout(() => void pump(), backoff(failures));
      return;
    }
    if (result.failure === "permanent") onDropped();
    failures = 0;
    await pump();
  }

  // Sends what's waiting now without waiting for the result (page hidden, or leaving).
  function sendNow() {
    if (stopped) return;
    failures = 0;
    update(makeAllReady(queue, now()));
    void pump();
  }

  function retry() {
    failures = 0;
    void pump();
  }

  return {
    getStatus: () => status,

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },

    enqueue(op: WorkoutOp, options?: { debounce?: boolean }) {
      update(enqueueOp(queue, op, now() + (options?.debounce ? TEXT_DEBOUNCE_MS : 0)));
      if (failures === 0) setStatus("saving");
      void pump();
    },

    // Sends everything now, skipping debounce and backoff. Resolves true once all is saved,
    // false if a send fails.
    flush(): Promise<boolean> {
      if (stopped) return Promise.resolve(false);
      update(makeAllReady(queue, now()));
      if (pendingCount(queue) === 0) return Promise.resolve(true);
      return new Promise<boolean>((resolve) => {
        waiters.push(resolve);
        failures = 0;
        void pump();
      });
    },

    sendNow,
    retry,

    // Stops sending (the workout is being saved or deleted); resume() undoes it on failure.
    stop() {
      stopped = true;
      clearTimeout(timer);
      resolveWaiters(false);
    },

    resume() {
      stopped = false;
      failures = 0;
      void pump();
    },

    attach() {
      detached = false;
      void pump();
    },

    detach() {
      detached = true;
      sendNow();
    },
  };
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;
