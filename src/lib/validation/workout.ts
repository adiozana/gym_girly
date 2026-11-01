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

// A set as written to session_sets (upsert by id). A done set needs at least one rep
// (SPEC.md: a set marked done with 0 reps is rejected).
export const sessionSetSchema = z
  .object({
    id: idSchema,
    session_exercise_id: idSchema,
    set_number: z.number().int().min(1).max(100),
    weight_kg: weightSchema,
    reps: repsSchema,
    is_done: z.boolean(),
  })
  .refine((set) => !set.is_done || (set.reps != null && set.reps >= 1), {
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
  z.object({ kind: z.literal("upsertSet"), set: sessionSetSchema }),
  z.object({ kind: z.literal("deleteSet"), id: idSchema, sessionExerciseId: idSchema }),
  z.object({ kind: z.literal("upsertExercise"), exercise: sessionExerciseSchema }),
  z.object({ kind: z.literal("deleteExercise"), id: idSchema }),
]);

export type SessionSetRow = z.input<typeof sessionSetSchema>;
export type SessionExerciseRow = z.input<typeof sessionExerciseSchema>;
export type WorkoutOp = z.input<typeof workoutOpSchema>;

export const MAX_OPS_PER_BATCH = 50;
export const workoutOpsSchema = z.array(z.unknown()).min(1).max(MAX_OPS_PER_BATCH);

export const exerciseContextSchema = z.object({
  exerciseId: idSchema,
  excludeSessionId: idSchema,
});
