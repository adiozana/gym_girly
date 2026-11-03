import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanList } from "@/components/plans/plan-list";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { listExercises } from "@/lib/exercises/queries";
import { listTemplates } from "@/lib/plans/queries";
import { strings } from "@/lib/strings";

export const metadata: Metadata = { title: strings.plans.title };

export default function PlansPage() {
  return (
    <Suspense fallback={<ListSkeleton title={strings.plans.title} rows={3} />}>
      <Plans />
    </Suspense>
  );
}

async function Plans() {
  const [{ active, archived }, library] = await Promise.all([listTemplates(), listExercises()]);
  return <PlanList active={active} archived={archived} exercises={library.active} />;
}
