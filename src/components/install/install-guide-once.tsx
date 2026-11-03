"use client";

import { useState, useSyncExternalStore } from "react";
import { InstallGuideSheet } from "@/components/install/install-guide-sheet";
import { detectPlatform } from "@/lib/install/platform";
import { isStandalone } from "@/lib/install/use-install";

// Per device on purpose: adding to the home screen is per device too.
const SEEN_KEY = "gym-girly:install-guide-seen";
const noop = () => () => {};

function shouldOffer(): boolean {
  try {
    if (localStorage.getItem(SEEN_KEY)) return false;
  } catch {
    return false; // no storage (private mode): don't nag on every visit
  }
  return !isStandalone() && detectPlatform(navigator.userAgent, navigator.maxTouchPoints) !== "other";
}

// Opens the home-screen guide once per phone, on the first home visit after signing in.
// Not when the app already runs from the home screen, and not on desktops.
export function InstallGuideOnce() {
  const offer = useSyncExternalStore(noop, shouldOffer, () => false);
  const [closed, setClosed] = useState(false);

  function handleOpenChange(open: boolean) {
    if (open) return;
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    setClosed(true);
  }

  return <InstallGuideSheet open={offer && !closed} onOpenChange={handleOpenChange} />;
}
