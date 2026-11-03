"use client";

import { useSyncExternalStore } from "react";
import { detectPlatform, type Platform } from "./platform";

// Chrome on Android fires `beforeinstallprompt` when the app can be installed directly; keeping
// the event lets the guide offer a one-tap "התקנה" button. Not in the DOM typings yet.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // our guide replaces Chrome's own mini bar
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

// True when the browser can install the app now (Android Chrome); false elsewhere.
export function useCanInstall(): boolean {
  return useSyncExternalStore(subscribe, () => deferredPrompt !== null, () => false);
}

// Shows the browser's install dialog; true if the user accepted. The event works only once.
export async function promptInstall(): Promise<boolean> {
  const event = deferredPrompt;
  if (!event) return false;
  deferredPrompt = null;
  notify();
  await event.prompt();
  return (await event.userChoice).outcome === "accepted";
}

const noop = () => () => {};

// The device's platform; null while rendering on the server.
export function usePlatform(): Platform | null {
  return useSyncExternalStore(
    noop,
    () => detectPlatform(navigator.userAgent, navigator.maxTouchPoints),
    () => null,
  );
}

// Already opened from the home screen (nothing left to explain).
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}
