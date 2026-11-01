import type { Metadata } from "next";
import { Suspense } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { PlanEditor } from "@/components/plans/plan-editor";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { listExercises } from "@/lib/exercises/queries";
import { getTemplate } from "@/lib/plans/queries";
import { strings } from "@/lib/strings";
import { idSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: strings.plans.title };

export default function PlanPage({ params }: PageProps<"/plans/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton backHref="/plans" rows={5} />}>
      <Plan params={params} />
    </Suspense>
  );
}

async function Plan({ params }: { params: PageProps<"/plans/[id]">["params"] }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return <NotFound />;

  const [plan, library] = await Promise.all([getTemplate(id), listExercises()]);
  if (!plan) return <NotFound />;

  return <PlanEditor plan={plan} exercises={library.active} />;
}

function NotFound() {
  return (
    <>
      <TopBar title={strings.plans.title} backHref="/plans" />
      <p className="py-10 text-center text-ink-muted">{strings.plans.notFound}</p>
    </>
  );
}
