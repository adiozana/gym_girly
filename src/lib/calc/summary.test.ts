import { describe, expect, it } from "vitest";
import { summarizeWorkout, type SummaryInput, type SummarySet } from "./summary";

const base = { startedAt: "2026-11-02T10:00:00Z", completedAt: "2026-11-02T10:45:20Z" };

function run(
  exercises: SummaryInput["exercises"],
  previous: [string, SummarySet[]][] = [],
) {
  return summarizeWorkout({ ...base, exercises, previous: new Map(previous) });
}

describe("summarizeWorkout", () => {
  it("computes duration, never negative", () => {
    expect(run([]).durationMinutes).toBe(45);
    const r = summarizeWorkout({ startedAt: base.completedAt, completedAt: base.startedAt, exercises: [], previous: new Map() });
    expect(r.durationMinutes).toBe(0);
  });

  it("computes counts and volume with bodyweight sets", () => {
    const r = run([
      { exerciseId: "a", name: "A", sets: [{ weight_kg: 50, reps: 10 }, { weight_kg: null, reps: 12 }] },
      { exerciseId: "b", name: "B", sets: [{ weight_kg: 22.5, reps: 3 }] },
      { exerciseId: "c", name: "C", sets: [] },
    ]);
    expect(r.exerciseCount).toBe(2);
    expect(r.setCount).toBe(3);
    expect(r.volumeKg).toBe(567.5);
  });

  it("picks best set by e1RM, not weight", () => {
    const r = run([{ exerciseId: "a", name: "A", sets: [{ weight_kg: 100, reps: 1 }, { weight_kg: 80, reps: 10 }] }]);
    expect(r.exercises[0].today).toEqual({ weight_kg: 80, reps: 10 });
  });

  it("marks first time", () => {
    const r = run([{ exerciseId: "a", name: "A", sets: [{ weight_kg: 50, reps: 10 }] }]);
    expect(r.exercises[0]).toMatchObject({ previous: null, change: null, trend: "first" });
  });

  it("detects up, down and same", () => {
    const prev: [string, SummarySet[]][] = [
      ["u", [{ weight_kg: 50, reps: 10 }]],
      ["d", [{ weight_kg: 50, reps: 10 }]],
      ["s", [{ weight_kg: 50, reps: 10 }]],
    ];
    const r = run(
      [
        { exerciseId: "u", name: "U", sets: [{ weight_kg: 55, reps: 10 }] },
        { exerciseId: "d", name: "D", sets: [{ weight_kg: 45, reps: 10 }] },
        { exerciseId: "s", name: "S", sets: [{ weight_kg: 50, reps: 10 }] },
      ],
      prev,
    );
    expect(r.exercises.map((e) => e.trend)).toEqual(["up", "down", "same"]);
    expect(r.exercises[0].change).toBe(10);
    expect(r.exercises[1].change).toBe(-10);
    expect(r.exercises[2].change).toBe(0);
  });

  it("merges duplicate exercises", () => {
    const r = run([
      { exerciseId: "a", name: "First", sets: [{ weight_kg: 50, reps: 10 }] },
      { exerciseId: "b", name: "B", sets: [{ weight_kg: 20, reps: 10 }] },
      { exerciseId: "a", name: "Second", sets: [{ weight_kg: 60, reps: 10 }] },
    ]);
    expect(r.exercises.map((e) => e.exerciseId)).toEqual(["a", "b"]);
    expect(r.exercises[0].name).toBe("First");
    expect(r.exercises[0].today).toEqual({ weight_kg: 60, reps: 10 });
    expect(r.setCount).toBe(3);
  });
});
