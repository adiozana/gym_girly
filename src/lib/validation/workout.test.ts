import { describe, expect, it } from "vitest";
import { sessionSetSchema, startSessionSchema, workoutOpSchema } from "./workout";

const ID = "00000000-0000-4000-8000-000000000001";
const set = { id: ID, session_exercise_id: ID, set_number: 1, weight_kg: 62.5, reps: 8, is_done: true };

describe("workout validation", () => {
  it("accepts a done set", () => {
    expect(sessionSetSchema.safeParse(set).success).toBe(true);
  });

  it("rejects a done set with 0 or no reps", () => {
    expect(sessionSetSchema.safeParse({ ...set, reps: 0 }).success).toBe(false);
    expect(sessionSetSchema.safeParse({ ...set, reps: null }).success).toBe(false);
  });

  it("allows an undone set with empty values or 0 reps", () => {
    expect(sessionSetSchema.safeParse({ ...set, is_done: false, reps: null, weight_kg: null }).success).toBe(true);
    expect(sessionSetSchema.safeParse({ ...set, is_done: false, reps: 0 }).success).toBe(true);
  });

  it("checks weight range and decimals", () => {
    expect(sessionSetSchema.safeParse({ ...set, weight_kg: 1.25 }).success).toBe(true);
    expect(sessionSetSchema.safeParse({ ...set, weight_kg: null }).success).toBe(true);
    expect(sessionSetSchema.safeParse({ ...set, weight_kg: 1.255 }).success).toBe(false);
    expect(sessionSetSchema.safeParse({ ...set, weight_kg: -1 }).success).toBe(false);
    expect(sessionSetSchema.safeParse({ ...set, weight_kg: 10000 }).success).toBe(false);
    expect(sessionSetSchema.safeParse({ ...set, reps: 1000 }).success).toBe(false);
  });

  it("validates ops by kind", () => {
    expect(workoutOpSchema.safeParse({ kind: "upsertSet", set }).success).toBe(true);
    expect(workoutOpSchema.safeParse({ kind: "deleteSet", id: ID, sessionExerciseId: ID }).success).toBe(true);
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
