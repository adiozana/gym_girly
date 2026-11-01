import { ChartBarIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ExerciseActions } from "@/components/exercises/exercise-actions";
import { TopBar } from "@/components/layout/top-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { getExercise, listExercises } from "@/lib/exercises/queries";
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
  const valid = idSchema.safeParse(id).success;
  const [exercise, library] = valid ? await Promise.all([getExercise(id), listExercises()]) : [null, null];

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

      <section className="mt-8 flex flex-col gap-2">
        <h2 className="text-section font-medium">{detail.alternatives}</h2>
        {exercise.alternatives.length === 0 ? (
          <p className="text-ink-muted">{detail.noAlternatives}</p>
        ) : (
          <ul className="divide-y divide-hairline rounded-md border border-hairline bg-surface">
            {exercise.alternatives.map((alternative) => (
              <li key={alternative.id}>
                <Link
                  href={`/exercises/${alternative.id}`}
                  className="flex min-h-14 items-center gap-3 px-4 py-2 active:bg-blush/60"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="wrap-break-word">{alternative.name_he}</span>
                    <span className="text-caption text-ink-muted">{strings.equipment[alternative.equipment]}</span>
                  </span>
                  <ChevronRightIcon aria-hidden="true" className="size-5 shrink-0 text-ink-subtle rtl:-scale-x-100" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8 flex flex-col">
        <h2 className="text-section font-medium">{detail.history}</h2>
        <EmptyState icon={ChartBarIcon} title={detail.historyEmpty} />
      </section>

      {exercise.is_personal ? (
        <ExerciseActions exercise={exercise} library={library?.active ?? []} />
      ) : (
        <p className="mt-auto pt-6 text-caption text-ink-muted">{detail.builtIn}</p>
      )}
    </div>
  );
}
