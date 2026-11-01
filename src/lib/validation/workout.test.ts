import { describe, expect, it } from "vitest";
import { exerciseSetsSchema, startSessionSchema, workoutOpSchema } from "./workout";

const ID = "00000000-0000-4000-8000-000000000001";
const sets = { sessionExerciseId: ID, setIds: [ID], weight_kg: 62.5, reps: 8, is_done: true };

describe("workout validation", () => {
  it("accepts a done exercise", () => {
    expect(exerciseSetsSchema.safeParse(sets).success).toBe(true);
  });

  it("rejects a done exercise with 0 or no reps", () => {
    expect(exerciseSetsSchema.safeParse({ ...sets, reps: 0 }).success).toBe(false);
    expect(exerciseSetsSchema.safeParse({ ...sets, reps: null }).success).toBe(false);
  });

  it("allows an undone exercise with empty values or 0 reps", () => {
    expect(exerciseSetsSchema.safeParse({ ...sets, is_done: false, reps: null, weight_kg: null }).success).toBe(true);
    expect(exerciseSetsSchema.safeParse({ ...sets, is_done: false, reps: 0 }).success).toBe(true);
  });

  it("needs 1 to 10 set ids", () => {
    const ids = (n: number) => Array.from({ length: n }, () => ID);
    expect(exerciseSetsSchema.safeParse({ ...sets, setIds: [] }).success).toBe(false);
    expect(exerciseSetsSchema.safeParse({ ...sets, setIds: ids(10) }).success).toBe(true);
    expect(exerciseSetsSchema.safeParse({ ...sets, setIds: ids(11) }).success).toBe(false);
    expect(exerciseSetsSchema.safeParse({ ...sets, setIds: ["nope"] }).success).toBe(false);
  });

  it("checks weight range and decimals", () => {
    expect(exerciseSetsSchema.safeParse({ ...sets, weight_kg: 1.25 }).success).toBe(true);
    expect(exerciseSetsSchema.safeParse({ ...sets, weight_kg: 0 }).success).toBe(true);
    expect(exerciseSetsSchema.safeParse({ ...sets, weight_kg: 9999.99 }).success).toBe(true);
    expect(exerciseSetsSchema.safeParse({ ...sets, weight_kg: null }).success).toBe(true);
    expect(exerciseSetsSchema.safeParse({ ...sets, weight_kg: 1.255 }).success).toBe(false);
    expect(exerciseSetsSchema.safeParse({ ...sets, weight_kg: -1 }).success).toBe(false);
    expect(exerciseSetsSchema.safeParse({ ...sets, weight_kg: 10000 }).success).toBe(false);
    expect(exerciseSetsSchema.safeParse({ ...sets, reps: 1000 }).success).toBe(false);
  });

  it("validates ops by kind", () => {
    expect(workoutOpSchema.safeParse({ kind: "saveSets", sets }).success).toBe(true);
    expect(workoutOpSchema.safeParse({ kind: "saveSets", sets: { ...sets, reps: 0 } }).success).toBe(false);
    expect(workoutOpSchema.safeParse({ kind: "upsertSet", sets }).success).toBe(false);
    expect(workoutOpSchema.safeParse({ kind: "deleteExercise", id: ID }).success).toBe(true);
    expect(workoutOpSchema.safeParse({ kind: "deleteExercise", id: "nope" }).success).toBe(false);
    expect(workoutOpSchema.safeParse({ kind: "drop", id: ID }).success).toBe(false);
  });

  it("starts from a template or a free workout on a local date", () => {
    expect(startSessionSchema.safeParse({ templateId: null, localDate: "2026-11-01" }).success).toBe(true);
    expect(startSessionSchema.safeParse({ templateId: ID, localDate: "2026-11-01" }).success).toBe(true);
    expect(startSessionSchema.safeParse({ templateId: null, localDate: "01/11/2026" }).success).toBe(false);
    expect(startSessionSchema.safeParse({ templateId: "x", localDate: "2026-11-01" }).success).toBe(false);
  });
});
