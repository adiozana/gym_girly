"use client";

import { useMemo } from "react";
import { ExerciseBrowser } from "@/components/exercises/exercise-browser";
import { Sheet } from "@/components/shared/sheet";
import type { ExerciseSummary } from "@/lib/exercises/types";

type ExercisePickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  exercises: ExerciseSummary[];
  excludeIds?: readonly string[];
  onSelect: (exercise: ExerciseSummary) => void;
};

// Library search in a full-height sheet; choosing a row selects it and closes the sheet.
export function ExercisePicker({ open, onOpenChange, title, exercises, excludeIds = [], onSelect }: ExercisePickerProps) {
  const available = useMemo(() => {
    const excluded = new Set(excludeIds);
    return exercises.filter((exercise) => !excluded.has(exercise.id));
  }, [exercises, excludeIds]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} tall>
      {/* Mounted only while open, so search and filters start fresh each time. */}
      {open && (
        <ExerciseBrowser
          exercises={available}
          onSelect={(exercise) => {
            onSelect(exercise);
            onOpenChange(false);
          }}
        />
      )}
    </Sheet>
  );
}
