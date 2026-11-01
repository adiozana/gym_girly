import { formatPlannedSets } from "@/lib/plans/format";

// "3 × 8–12" reads left to right; the Hebrew-only form ("3 סטים") keeps the page direction.
export function PlannedSets({ sets, repMin, repMax }: { sets: number; repMin: number | null; repMax: number | null }) {
  const numeric = repMin != null || repMax != null;
  return (
    <bdi dir={numeric ? "ltr" : undefined} className="tabular-nums">
      {formatPlannedSets(sets, repMin, repMax)}
    </bdi>
  );
}
