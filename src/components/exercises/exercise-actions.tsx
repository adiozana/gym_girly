"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExerciseFormSheet } from "@/components/exercises/exercise-form-sheet";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteExercise, setExerciseArchived } from "@/lib/exercises/actions";
import type { ExerciseDetail } from "@/lib/exercises/queries";
import { strings } from "@/lib/strings";

const { detail } = strings.exercises;

// Edit / archive / delete for a personal exercise (built-ins are read-only).
export function ExerciseActions({ exercise }: { exercise: ExerciseDetail }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  function setArchived(archived: boolean, withUndo = true) {
    startTransition(async () => {
      const result = await setExerciseArchived(exercise.id, archived);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(archived ? strings.exercises.archived : strings.exercises.restored, {
        action: withUndo
          ? { label: strings.common.undo, onClick: () => setArchived(!archived, false) }
          : undefined,
      });
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteExercise(exercise.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setConfirmingDelete(false);
      toast.success(strings.exercises.deleted);
      router.replace("/exercises");
    });
  }

  return (
    <div className="mt-auto flex flex-col gap-3 pt-10">
      {exercise.is_archived ? (
        <p className="text-caption text-ink-muted">{detail.archivedNote}</p>
      ) : (
        exercise.in_use && <p className="text-caption text-ink-muted">{detail.inUse}</p>
      )}

      {!exercise.is_archived && (
        <Button variant="outline" size="lg" onClick={() => setEditing(true)} disabled={pending}>
          {detail.edit}
        </Button>
      )}
      <Button variant="outline" size="lg" onClick={() => setArchived(!exercise.is_archived)} disabled={pending}>
        {exercise.is_archived ? detail.restore : detail.archive}
      </Button>
      {!exercise.in_use && (
        <Button variant="destructive" size="lg" onClick={() => setConfirmingDelete(true)} disabled={pending}>
          {detail.delete}
        </Button>
      )}

      <ExerciseFormSheet
        open={editing}
        onOpenChange={setEditing}
        exerciseId={exercise.id}
        initialValues={{
          name_he: exercise.name_he,
          name_en: exercise.name_en ?? "",
          muscle_group: exercise.muscle_group,
          equipment: exercise.equipment,
          instructions_he: exercise.instructions_he ?? "",
        }}
      />

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={detail.deleteTitle}
        description={
          <>
            <bdi>{exercise.name_he}</bdi> · {detail.deleteBody}
          </>
        }
        confirmLabel={detail.delete}
        confirmVariant="danger"
        cancelLabel={strings.common.cancel}
        onConfirm={remove}
        pending={pending}
      />
    </div>
  );
}
