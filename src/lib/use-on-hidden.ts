"use client";

import { useLayoutEffect, useRef } from "react";

// Next.js keeps a page you navigate away from mounted but hidden (React <Activity>), with its
// state intact. Transient UI state (an open sheet or dialog, a "starting…" spinner) must be reset
// as the page is hidden, or it is still there when you come back: an open modal keeps the page
// inert. The layout-effect cleanup runs exactly then (and on unmount).
// See node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md.
//
// The reset waits a microtask and is cancelled if the effect is set up again right away: that is
// Strict Mode's mount → cleanup → mount check in development, not a real hide, and resetting there
// would close a sheet the moment it opens.
export function useOnHidden(callback: () => void) {
  const latest = useRef(callback);
  const pending = useRef(false);
  useLayoutEffect(() => {
    latest.current = callback;
  });
  useLayoutEffect(() => {
    pending.current = false;
    return () => {
      pending.current = true;
      queueMicrotask(() => {
        if (pending.current) latest.current();
      });
    };
  }, []);
}
