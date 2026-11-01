"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChoiceChips } from "@/components/shared/chip";
import { Sheet } from "@/components/shared/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createExercise, updateExercise } from "@/lib/exercises/actions";
import { EQUIPMENT, MUSCLE_GROUPS, type Equipment, type MuscleGroup } from "@/lib/exercises/types";
import { strings } from "@/lib/strings";
import { exerciseInputSchema } from "@/lib/validation/exercises";

const { form } = strings.exercises;

export type ExerciseFormValues = {
  name_he: string;
  name_en: string;
  muscle_group: MuscleGroup | null;
  equipment: Equipment | null;
  instructions_he: string;
};

const emptyValues: ExerciseFormValues = {
  name_he: "",
  name_en: "",
  muscle_group: null,
  equipment: null,
  instructions_he: "",
};

type ExerciseFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // When set, the sheet edits this exercise; otherwise it creates a new one.
  exerciseId?: string;
  initialValues?: ExerciseFormValues;
  onCreated?: (id: string) => void;
};

export function ExerciseFormSheet({ open, onOpenChange, exerciseId, initialValues, onCreated }: ExerciseFormSheetProps) {
  const [values, setValues] = useState(initialValues ?? emptyValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ExerciseFormValues>(key: K, value: ExerciseFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  function handleOpenChange(next: boolean) {
    // Each opening starts from the saved values.
    if (next) {
      setValues(initialValues ?? emptyValues);
      setErrors({});
    }
    onOpenChange(next);
  }

  function submit() {
    const parsed = exerciseInputSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      const result = exerciseId
        ? await updateExercise(exerciseId, parsed.data)
        : await createExercise(parsed.data);
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors);
        else toast.error(result.error);
        return;
      }
      onOpenChange(false);
      if (result.data) onCreated?.(result.data.id);
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title={exerciseId ? form.titleEdit : form.titleNew}
      footer={
        <Button size="lg" className="w-full" onClick={submit} disabled={pending} aria-busy={pending}>
          {strings.common.save}
        </Button>
      }
    >
      <form
        className="flex flex-col gap-6"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="exercise-name-he">{form.nameHe}</Label>
          <Input
            id="exercise-name-he"
            value={values.name_he}
            onChange={(event) => set("name_he", event.target.value)}
            dir="auto"
            aria-invalid={Boolean(errors.name_he)}
            aria-describedby={errors.name_he ? "exercise-name-he-error" : undefined}
          />
          {errors.name_he && (
            <p id="exercise-name-he-error" className="text-caption text-danger">
              {errors.name_he}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="exercise-name-en">
            {form.nameEn} <span className="font-normal text-ink-muted">({strings.common.optional})</span>
          </Label>
          <Input
            id="exercise-name-en"
            value={values.name_en}
            onChange={(event) => set("name_en", event.target.value)}
            dir="ltr"
            className="text-end"
            autoCapitalize="words"
          />
        </div>

        <ChoiceChips
          label={form.muscleGroup}
          options={MUSCLE_GROUPS}
          labels={strings.muscleGroups}
          value={values.muscle_group}
          onChange={(value) => set("muscle_group", value)}
          error={errors.muscle_group}
        />

        <ChoiceChips
          label={form.equipment}
          options={EQUIPMENT}
          labels={strings.equipment}
          value={values.equipment}
          onChange={(value) => set("equipment", value)}
          error={errors.equipment}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="exercise-instructions">
            {form.instructions} <span className="font-normal text-ink-muted">({strings.common.optional})</span>
          </Label>
          <textarea
            id="exercise-instructions"
            value={values.instructions_he}
            onChange={(event) => set("instructions_he", event.target.value)}
            dir="auto"
            rows={4}
            aria-describedby="exercise-instructions-hint"
            className="w-full rounded-md border border-hairline bg-surface px-4 py-3 text-base outline-none focus-visible:border-rose-deep focus-visible:ring-2 focus-visible:ring-rose-deep/25 focus-visible:ring-offset-0"
          />
          <p id="exercise-instructions-hint" className="text-caption text-ink-muted">
            {errors.instructions_he || form.instructionsHint}
          </p>
        </div>
      </form>
    </Sheet>
  );
}
