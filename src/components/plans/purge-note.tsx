"use client";

import { useSyncExternalStore } from "react";
import { daysUntilPurge } from "@/lib/calc/archive";
import { strings } from "@/lib/strings";

const noop = () => () => {};
// Rounded to the hour so the snapshot stays stable between renders.
const nowOnDevice = () => Math.floor(Date.now() / 3_600_000) * 3_600_000;

// "Deleted in N days" under an archived plan. Rendered on the device only, where "now" is known.
export function PurgeNote({ archivedAt, className }: { archivedAt: string | null; className?: string }) {
  const now = useSyncExternalStore(noop, nowOnDevice, () => null);
  if (!archivedAt || now === null) return null;
  return <span className={className}>{strings.plans.purgeIn(daysUntilPurge(archivedAt, new Date(now)))}</span>;
}
