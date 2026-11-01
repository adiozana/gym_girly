"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExerciseBrowser } from "@/components/exercises/exercise-browser";
import { ExerciseFormSheet } from "@/components/exercises/exercise-form-sheet";
import { TopBar } from "@/components/layout/top-bar";
import { ArchivedSection } from "@/components/shared/archived-section";
import { Button } from "@/components/ui/button";
import type { ExerciseSummary } from "@/lib/exercises/types";
import { strings } from "@/lib/strings";

export function ExerciseLibrary({ active, archived }: { active: ExerciseSummary[]; archived: ExerciseSummary[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const newExerciseButton = (
    <Button variant="link" onClick={() => setCreating(true)}>
      <PlusIcon aria-hidden="true" />
      {strings.exercises.newExercise}
    </Button>
  );

  return (
    <>
      <TopBar title={strings.exercises.title} action={newExerciseButton} />
      <ExerciseBrowser
        exercises={active}
        hrefFor={(exercise) => `/exercises/${exercise.id}`}
        emptyAction={newExerciseButton}
      />
      <ArchivedSection title={strings.exercises.archivedSection} count={archived.length}>
        <ul className="divide-y divide-hairline">
          {archived.map((exercise) => (
            <li key={exercise.id}>
              <Link
                href={`/exercises/${exercise.id}`}
                className="flex min-h-14 items-center text-ink-muted active:bg-blush/60"
              >
                {exercise.name_he}
              </Link>
            </li>
          ))}
        </ul>
      </ArchivedSection>
      <ExerciseFormSheet
        exercises={active}
        open={creating}
        onOpenChange={setCreating}
        onCreated={(id) => router.push(`/exercises/${id}`)}
      />
    </>
  );
}
