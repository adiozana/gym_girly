import { ChartBarIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ExerciseActions } from "@/components/exercises/exercise-actions";
import { TopBar } from "@/components/layout/top-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { getExercise } from "@/lib/exercises/queries";
import { strings } from "@/lib/strings";
import { idSchema } from "@/lib/validation/common";

const { detail } = strings.exercises;

export const metadata: Metadata = { title: strings.exercises.title };

export default function ExercisePage({ params }: PageProps<"/exercises/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton backHref="/exercises" rows={3} />}>
      <Exercise params={params} />
    </Suspense>
  );
}

async function Exercise({ params }: { params: PageProps<"/exercises/[id]">["params"] }) {
  const { id } = await params;
  const exercise = idSchema.safeParse(id).success ? await getExercise(id) : null;

  if (!exercise) {
    return (
      <>
        <TopBar title={strings.exercises.title} backHref="/exercises" />
        <p className="py-10 text-center text-ink-muted">{detail.notFound}</p>
      </>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title={exercise.name_he} backHref="/exercises" />

      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-blush px-3 py-1 text-label text-ink-muted">
          {strings.muscleGroups[exercise.muscle_group]}
        </span>
        <span className="rounded-md bg-blush px-3 py-1 text-label text-ink-muted">
          {strings.equipment[exercise.equipment]}
        </span>
        {exercise.is_personal && (
          <span className="rounded-md border border-hairline px-3 py-1 text-label text-ink-muted">
            {strings.exercises.personalBadge}
          </span>
        )}
      </div>
      {exercise.name_en && (
        <p dir="ltr" className="mt-2 text-end text-ink-muted">
          {exercise.name_en}
        </p>
      )}

      <section className="mt-8 flex flex-col gap-2">
        <h2 className="text-section font-medium">{detail.instructions}</h2>
        <p className="max-w-[65ch] text-ink">{exercise.instructions_he ?? detail.noInstructions}</p>
      </section>

      <section className="mt-8 flex flex-col">
        <h2 className="text-section font-medium">{detail.history}</h2>
        <EmptyState icon={ChartBarIcon} title={detail.historyEmpty} />
      </section>

      {exercise.is_personal ? (
        <ExerciseActions exercise={exercise} />
      ) : (
        <p className="mt-auto pt-6 text-caption text-ink-muted">{detail.builtIn}</p>
      )}
    </div>
  );
}
