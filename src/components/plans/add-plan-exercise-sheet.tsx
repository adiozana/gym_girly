"use client";

import { useState } from "react";
import { PlanExerciseFields, type PlanExerciseValues } from "@/components/plans/plan-exercise-fields";
import { Sheet } from "@/components/shared/sheet";
import { Button } from "@/components/ui/button";
import type { ExerciseSummary } from "@/lib/exercises/types";
import { strings } from "@/lib/strings";

const { editor } = strings.plans;

export const DEFAULT_PLAN_EXERCISE: PlanExerciseValues = {
  planned_sets: 3,
  rep_range_min: null,
  rep_range_max: null,
  target_weight_kg: null,
  note: null,
};

type AddPlanExerciseSheetProps = {
  // The exercise just picked from the library; null closes the sheet.
  exercise: ExerciseSummary | null;
  onClose: () => void;
  onAdd: (exercise: ExerciseSummary, values: PlanExerciseValues) => void;
};

// After picking an exercise: set its sets, weight, rep range and note, then add it to the plan.
export function AddPlanExerciseSheet({ exercise, onClose, onAdd }: AddPlanExerciseSheetProps) {
  const [values, setValues] = useState<PlanExerciseValues>(DEFAULT_PLAN_EXERCISE);
  const close = () => {
    setValues(DEFAULT_PLAN_EXERCISE);
    onClose();
  };

  return (
    <Sheet
      open={exercise !== null}
      onOpenChange={(open) => !open && close()}
      title={exercise?.name_he ?? ""}
      description={editor.addSheetHint}
      footer={
        <Button
          size="lg"
          className="w-full"
          onClick={() => {
            if (!exercise) return;
            onAdd(exercise, values);
            close();
          }}
        >
          {editor.addToPlan}
        </Button>
      }
    >
      {exercise && (
        // Keyed by the exercise, so every addition starts from the defaults.
        <PlanExerciseFields
          key={exercise.id}
          idPrefix={`add-${exercise.id}`}
          value={values}
          onChange={(settings) => setValues((prev) => ({ ...prev, ...settings, note: settings.note ?? prev.note }))}
        />
      )}
    </Sheet>
  );
}
