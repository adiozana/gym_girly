import { describe, expect, it } from "vitest";
import { computeProgress, rangeStart, type ProgressSession } from "./progress";

const session = (
  id: string,
  date: string,
  exercises: ProgressSession["exercises"],
  startedAt = `${date}T10:00:00Z`,
): ProgressSession => ({ sessionId: id, date, startedAt, exercises });

const ex = (id: string, weight: number | null, reps: number) => ({
  exerciseId: id,
  name: id.toUpperCase(),
  sets: [{ weight_kg: weight, reps }],
});

describe("rangeStart", () => {
  it("subtracts months or returns null", () => {
    expect(rangeStart("month", "2026-11-01")).toBe("2026-10-01");
    expect(rangeStart("3months", "2026-11-01")).toBe("2026-08-01");
    expect(rangeStart("all", "2026-11-01")).toBeNull();
  });
});

describe("computeProgress", () => {
  it("handles no sessions", () => {
    const r = computeProgress([]);
    expect(r).toEqual({ points: [], exercises: [], headline: null, sinceDate: null, enoughData: false });
  });

  it("handles a single session", () => {
    const r = computeProgress([session("s1", "2026-10-01", [ex("a", 40, 8)])]);
    expect(r.enoughData).toBe(false);
    expect(r.headline).toBe(0);
    expect(r.points).toEqual([{ sessionId: "s1", date: "2026-10-01", value: 0 }]);
    expect(r.exercises[0].firstTime).toBe(true);
    expect(r.exercises[0].last).toBeNull();
    expect(r.exercises[0].change).toBeNull();
  });

  it("matches a hand-computed example", () => {
    // Bodyweight-free numbers chosen for clean arithmetic (Epley, w*(1+r/30)):
    // S1: A 60x30 -> 120 (baseline), B 30x30 -> 60 (baseline). Point = 0.
    // S2: A 66x30 -> 132 (+10%), B 36x30 -> 72 (+20%). Point = (10+20)/2 = 15.
    // S3: A 60x30 -> 120 (0%), B 45x30 -> 90 (+50%). Point = (0+50)/2 = 25.
    const r = computeProgress([
      session("s3", "2026-10-15", [ex("a", 60, 30), ex("b", 45, 30)]),
      session("s1", "2026-10-01", [ex("a", 60, 30), ex("b", 30, 30)]),
      session("s2", "2026-10-08", [ex("a", 66, 30), ex("b", 36, 30)]),
    ]);
    expect(r.points.map((p) => p.value)).toEqual([0, 15, 25]);
    expect(r.headline).toBe(25);
    expect(r.sinceDate).toBe("2026-10-01");
    expect(r.enoughData).toBe(true);
    expect(r.exercises.map((e) => [e.exerciseId, e.change])).toEqual([
      ["a", 0],
      ["b", 50],
    ]);
    expect(r.exercises[1].first).toEqual({ weight_kg: 30, reps: 30, date: "2026-10-01" });
    expect(r.exercises[1].last).toEqual({ weight_kg: 45, reps: 30, date: "2026-10-15" });
  });

  it("includes an exercise mid-range only from its second time", () => {
    // S1: A 60x30 = 120. S2: A 66x30 = 132 (+10), B first time 30x30 = 60 (excluded) -> 10.
    // S3: A 66x30 (+10), B 36x30 = 72 (+20) -> 15.
    const r = computeProgress([
      session("s1", "2026-10-01", [ex("a", 60, 30)]),
      session("s2", "2026-10-08", [ex("a", 66, 30), ex("b", 30, 30)]),
      session("s3", "2026-10-15", [ex("a", 66, 30), ex("b", 36, 30)]),
    ]);
    expect(r.points.map((p) => p.value)).toEqual([0, 10, 15]);
    expect(r.exercises.find((e) => e.exerciseId === "b")?.firstTime).toBe(false);
  });

  it("gives a session with only first-time exercises a value of 0", () => {
    const r = computeProgress([
      session("s1", "2026-10-01", [ex("a", 60, 30)]),
      session("s2", "2026-10-08", [ex("c", 20, 10)]),
    ]);
    expect(r.points[1].value).toBe(0);
  });

  it("treats an alternative exercise as a separate row with its own baseline", () => {
    const r = computeProgress([
      session("s1", "2026-10-01", [ex("press", 60, 30)]),
      session("s2", "2026-10-08", [ex("alt", 20, 30)]),
      session("s3", "2026-10-15", [ex("alt", 22, 30)]),
    ]);
    expect(r.exercises.map((e) => e.exerciseId)).toEqual(["press", "alt"]);
    expect(r.exercises[0].firstTime).toBe(true);
    expect(r.exercises[1].change).toBe(10);
    expect(r.points.map((p) => p.value)).toEqual([0, 0, 10]);
  });

  it("takes the max across a duplicated exercise in one session and sorts by startedAt", () => {
    const r = computeProgress([
      session("late", "2026-10-01", [ex("a", 66, 30)], "2026-10-01T18:00:00Z"),
      session("early", "2026-10-01", [
        { exerciseId: "a", name: "A", sets: [{ weight_kg: 30, reps: 30 }] },
        { exerciseId: "a", name: "A", sets: [{ weight_kg: 60, reps: 30 }] },
      ], "2026-10-01T08:00:00Z"),
    ]);
    expect(r.points.map((p) => p.sessionId)).toEqual(["early", "late"]);
    expect(r.points[1].value).toBe(10);
  });
});
