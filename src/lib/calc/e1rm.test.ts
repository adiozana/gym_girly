import { describe, expect, it } from "vitest";
import { bestSet, e1rm, percentChange, round1 } from "./e1rm";

describe("round1", () => {
  it("rounds to one decimal and avoids -0", () => {
    expect(round1(1.26)).toBe(1.3);
    expect(round1(-0.04)).toBe(0);
    expect(Object.is(round1(-0.04), 0)).toBe(true);
  });
});

describe("e1rm", () => {
  it("uses Epley", () => {
    expect(e1rm({ weight_kg: 60, reps: 30 })).toBe(120);
    expect(e1rm({ weight_kg: 100, reps: 3 })).toBeCloseTo(110);
  });
  it("uses reps for bodyweight", () => {
    expect(e1rm({ weight_kg: null, reps: 12 })).toBe(12);
    expect(e1rm({ weight_kg: 0, reps: 8 })).toBe(8);
  });
});

describe("bestSet", () => {
  it("picks the highest e1RM", () => {
    const a = { weight_kg: 40, reps: 8 };
    const b = { weight_kg: 50, reps: 5 };
    expect(bestSet([a, b])).toBe(b);
  });
  it("keeps the earlier set on ties", () => {
    const a = { weight_kg: 40, reps: 6, id: 1 };
    const b = { weight_kg: 40, reps: 6, id: 2 };
    expect(bestSet([a, b])).toBe(a);
  });
  it("ignores sets with no reps and returns null when empty", () => {
    expect(bestSet([])).toBeNull();
    expect(bestSet([{ weight_kg: 100, reps: 0 }])).toBeNull();
  });
});

describe("percentChange", () => {
  it("computes the rounded percentage", () => {
    expect(percentChange(110, 100)).toBe(10);
    expect(percentChange(90, 100)).toBe(-10);
    expect(percentChange(100, 100)).toBe(0);
  });
  it("returns null for a non-positive baseline", () => {
    expect(percentChange(5, 0)).toBeNull();
  });
});
