"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { WorkoutOp } from "@/lib/validation/workout";
import { applyWorkoutOps } from "./actions";
import type { QueueState } from "./queue";
import { createSyncEngine, type SendResult, type SyncStatus } from "./sync-engine";

export type { SyncStatus } from "./sync-engine";

type Options = {
  sessionId: string;
  initialQueue: QueueState;
  onDropped: () => void;
  onChange: (ops: WorkoutOp[]) => void;
};

async function sendBatch(sessionId: string, ops: WorkoutOp[]): Promise<SendResult> {
  const result = await applyWorkoutOps(sessionId, ops);
  return result.ok ? result.data : { applied: 0, failure: "transient" };
}

// React glue for the sync engine (./sync-engine.ts): one engine per screen, a retry when
// the connection returns, and a send of what's waiting when the page is hidden or left.
export function useWorkoutSync({ sessionId, initialQueue, onDropped, onChange }: Options) {
  const [engine] = useState(() =>
    createSyncEngine({ initialQueue, send: (ops) => sendBatch(sessionId, ops), onDropped, onChange }),
  );
  const status: SyncStatus = useSyncExternalStore(engine.subscribe, engine.getStatus, engine.getStatus);

  useEffect(() => {
    // Ops restored from storage after a reload go out right away.
    engine.attach();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") engine.sendNow();
    };
    window.addEventListener("online", engine.retry);
    window.addEventListener("pagehide", engine.sendNow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", engine.retry);
      window.removeEventListener("pagehide", engine.sendNow);
      document.removeEventListener("visibilitychange", onVisibility);
      // Leaving the screen inside the app (e.g. back home): send what's waiting now.
      engine.detach();
    };
  }, [engine]);

  return { ...engine, status };
}
