import { strings } from "@/lib/strings";

// "3 × 8–12", "3 × 10" or "3 סטים" (SPEC.md: the rep range shows in the card title).
// The numeric forms are meant to be rendered left-to-right (inside <bdi dir="ltr">).
export function formatPlannedSets(sets: number, repMin: number | null, repMax: number | null): string {
  if (repMin == null && repMax == null) return strings.plans.editor.setsOnly(sets);
  const reps = repMin == null || repMax == null || repMin === repMax ? `${repMin ?? repMax}` : `${repMin}–${repMax}`;
  return `${sets} × ${reps}`;
}
