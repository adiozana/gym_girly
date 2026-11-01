import { z } from "zod";
import { strings } from "@/lib/strings";
import { idSchema, optionalText } from "./common";

const { workout } = strings;

export const startSessionSchema = z.object({
  templateId: idSchema.nullable(),
  // The device's local date (SPEC.md: dates follow the browser's time zone).
  localDate: z.iso.date(),
});

const hasAtMostTwoDecimals = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

export const weightSchema = z
  .number({ error: workout.errors.weightInvalid })
  .min(0, { error: workout.errors.weightInvalid })
  .max(9999.99, { error: workout.errors.weightInvalid })
  .refine(hasAtMostTwoDecimals, { error: workout.errors.weightInvalid })
  .nullable();

export const repsSchema = z
  .number({ error: workout.errors.repsInvalid })
  .int({ error: workout.errors.repsInvalid })
  .min(0, { error: workout.errors.repsInvalid })
  .max(999, { error: workout.errors.repsInvalid })
  .nullable();

// All sets of one exercise, written in one go (SPEC.md: one weight and reps per exercise,
// one tap marks the whole exercise). A done exercise needs at least one rep.
export const exerciseSetsSchema = z
  .object({
    sessionExerciseId: idSchema,
    setIds: z.array(idSchema).min(1).max(10),
    weight_kg: weightSchema,
    reps: repsSchema,
    is_done: z.boolean(),
  })
  .refine((sets) => !sets.is_done || (sets.reps != null && sets.reps >= 1), {
    error: workout.errors.repsRequired,
    path: ["reps"],
  });

// An exercise card as written to session_exercises (insert or update by id).
export const sessionExerciseSchema = z.object({
  id: idSchema,
  exercise_id: idSchema,
  replaced_exercise_id: idSchema.nullable(),
  template_exercise_id: idSchema.nullable(),
  position: z.number().int().min(1).max(1000),
  note: optionalText(300, workout.errors.noteTooLong),
});

export const workoutOpSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("saveSets"), sets: exerciseSetsSchema }),
  z.object({ kind: z.literal("upsertExercise"), exercise: sessionExerciseSchema }),
  z.object({ kind: z.literal("deleteExercise"), id: idSchema }),
]);

export type ExerciseSetsRow = z.input<typeof exerciseSetsSchema>;
export type SessionExerciseRow = z.input<typeof sessionExerciseSchema>;
export type WorkoutOp = z.input<typeof workoutOpSchema>;

export const MAX_OPS_PER_BATCH = 50;
export const workoutOpsSchema = z.array(z.unknown()).min(1).max(MAX_OPS_PER_BATCH);

export const exerciseContextSchema = z.object({
  exerciseId: idSchema,
  excludeSessionId: idSchema,
});
