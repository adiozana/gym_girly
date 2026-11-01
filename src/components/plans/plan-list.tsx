"use client";

import { ChevronRightIcon, ClipboardDocumentListIcon, PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { PlanMenu } from "@/components/plans/plan-menu";
import { PlanNameSheet } from "@/components/plans/plan-name-sheet";
import { ArchivedSection } from "@/components/shared/archived-section";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { createTemplate } from "@/lib/plans/actions";
import type { TemplateSummary } from "@/lib/plans/types";
import { strings } from "@/lib/strings";

export function PlanList({ active, archived }: { active: TemplateSummary[]; archived: TemplateSummary[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const newPlanButton = (
    <Button size="lg" className="w-full" onClick={() => setCreating(true)}>
      <PlusIcon aria-hidden="true" />
      {strings.plans.newPlan}
    </Button>
  );

  return (
    <>
      <TopBar title={strings.plans.title} />

      {active.length === 0 ? (
        <EmptyState
          icon={ClipboardDocumentListIcon}
          title={strings.plans.emptyTitle}
          body={strings.plans.emptyBody}
          action={newPlanButton}
        />
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {active.map((plan) => (
              <li key={plan.id}>
                <PlanCard plan={plan} />
              </li>
            ))}
          </ul>
          <div className="mt-6">{newPlanButton}</div>
        </>
      )}

      <ArchivedSection title={strings.plans.archivedSection} count={archived.length}>
        <ul className="flex flex-col gap-3">
          {archived.map((plan) => (
            <li key={plan.id}>
              <PlanCard plan={plan} />
            </li>
          ))}
        </ul>
      </ArchivedSection>

      <PlanNameSheet
        open={creating}
        onOpenChange={setCreating}
        title={strings.plans.newPlan}
        submitLabel={strings.plans.create}
        onSubmit={createTemplate}
        onDone={(data) => router.push(`/plans/${data.id}`)}
      />
    </>
  );
}

function PlanCard({ plan }: { plan: TemplateSummary }) {
  return (
    <div className="flex items-center rounded-md border border-hairline bg-surface pe-1">
      <Link
        href={`/plans/${plan.id}`}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-md py-3 ps-4 active:bg-blush/60"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={plan.is_archived ? "text-ink-muted wrap-break-word" : "font-medium wrap-break-word"}>
            {plan.name}
          </span>
          <span className="text-caption text-ink-muted">
            {plan.exercise_count === 0 ? strings.plans.noExercises : strings.plans.exerciseCount(plan.exercise_count)}
          </span>
        </span>
        <ChevronRightIcon aria-hidden="true" className="size-5 shrink-0 text-ink-subtle rtl:-scale-x-100" />
      </Link>
      <PlanMenu plan={plan} />
    </div>
  );
}
