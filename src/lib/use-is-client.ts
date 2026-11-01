"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// False on the server and during hydration, true after. For values that depend on the
// device (its time zone, the current time), so the server HTML never disagrees with them.
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
