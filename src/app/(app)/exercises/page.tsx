import type { Metadata } from "next";
import { Suspense } from "react";
import { ExerciseLibrary } from "@/components/exercises/exercise-library";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { listExercises } from "@/lib/exercises/queries";
import { strings } from "@/lib/strings";

export const metadata: Metadata = { title: strings.exercises.title };

export default function ExercisesPage() {
  return (
    <Suspense fallback={<ListSkeleton title={strings.exercises.title} />}>
      <Exercises />
    </Suspense>
  );
}

async function Exercises() {
  const { active, archived } = await listExercises();
  return <ExerciseLibrary active={active} archived={archived} />;
}
