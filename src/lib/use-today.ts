"use client";

import { format } from "date-fns";
import { useSyncExternalStore } from "react";

const noop = () => () => {};
const todayOnDevice = () => format(new Date(), "yyyy-MM-dd");

// Today's date on the device (SPEC.md: days follow the browser's time zone). null while
// rendering on the server, where the device's date isn't known.
export function useToday(): string | null {
  return useSyncExternalStore(noop, todayOnDevice, () => null);
}
