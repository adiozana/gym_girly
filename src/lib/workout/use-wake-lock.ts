"use client";

import { useEffect } from "react";

// Keeps the screen on during an active workout (SPEC.md: Screen Wake Lock, if supported).
// The browser releases the lock when the page is hidden, so it's requested again when the
// page becomes visible. Silent when unsupported or denied.
export function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;

    const request = async () => {
      if (document.visibilityState !== "visible" || (sentinel && !sentinel.released)) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (disposed) void lock.release().catch(() => undefined);
        else sentinel = lock;
      } catch {
        // Denied (e.g. battery saver): the workout works the same without it.
      }
    };

    const onVisibility = () => void request();
    void request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, []);
}
