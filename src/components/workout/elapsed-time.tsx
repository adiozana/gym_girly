"use client";

import { cn } from "cn";
import { useSyncExternalStore } from "react";
import { formatElapsed } from "@/lib/workout/format";

// One shared one-second clock for every elapsed-time display. It runs only while something
// is subscribed, and is 0 on the server and before the first tick, so the server HTML and
// hydration never disagree about the time.
let now = 0;
let interval: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!interval) {
    now = Date.now();
    interval = setInterval(() => {
      now = Date.now();
      for (const notify of listeners) notify();
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(interval);
      interval = undefined;
      now = 0;
    }
  };
}

const getSnapshot = () => now;
const getServerSnapshot = () => 0;

export function ElapsedTime({ startedAt, className }: { startedAt: string; className?: string }) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const start = new Date(startedAt).getTime();
  return (
    // Reserve the width until the clock starts, so nothing shifts.
    <span dir="ltr" className={cn("tabular-nums", current === 0 && "invisible", className)}>
      {formatElapsed(current === 0 ? 0 : current - start)}
    </span>
  );
}
