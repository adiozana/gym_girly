import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TopBar } from "@/components/layout/top-bar";
import { buttonVariants } from "@/components/ui/button";
import { WorkoutLoader } from "@/components/workout/workout-loader";
import { WorkoutSkeleton } from "@/components/workout/workout-skeleton";
import { strings } from "@/lib/strings";
import { idSchema } from "@/lib/validation/common";
import { getWorkout } from "@/lib/workout/queries";

export const metadata: Metadata = { title: strings.workout.title };

export default function WorkoutPage({ params }: PageProps<"/workout/[id]">) {
  return (
    <Suspense fallback={<WorkoutSkeleton />}>
      <Workout params={params} />
    </Suspense>
  );
}

async function Workout({ params }: { params: PageProps<"/workout/[id]">["params"] }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return <NotFound />;

  const data = await getWorkout(id);
  if (data.status === "not_found") return <NotFound />;
  // A saved workout opens its summary; it is edited from its details page (/sessions/[id]).
  if (data.status === "completed") redirect(`/workout/${id}/summary`);

  return <WorkoutLoader workout={data.workout} library={data.library} />;
}

function NotFound() {
  return (
    <>
      <TopBar title={strings.workout.title} backHref="/" />
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <p className="text-ink-muted">{strings.workout.notFound}</p>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          {strings.workout.header.back}
        </Link>
      </div>
    </>
  );
}
