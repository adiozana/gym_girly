import { describe, expect, it } from "vitest";
import type { Goal } from "./day-status";
import { currentStreak, longestStreak } from "./streak";

// Cycle: 1 day on, 1 day off, starting 2026-10-01 (on: odd October days, off: even).
const cycle: Goal = { type: "cycle", cycle_on: 1, cycle_off: 1, start_date: "2026-10-01", end_date: null };
const dates = (...d: string[]) => new Set(d);

describe("currentStreak", () => {
  it("returns 0 with no goals", () => {
    expect(currentStreak([], dates(), "2026-10-10")).toBe(0);
  });

  it("does not let a pending today break the streak", () => {
    // Today 10-05 is a training day, not done yet. 10-01..10-04 are compliant.
    expect(currentStreak([cycle], dates("2026-10-01", "2026-10-03"), "2026-10-05")).toBe(4);
  });

  it("counts today when trained, and rest days count", () => {
    expect(currentStreak([cycle], dates("2026-10-01", "2026-10-03", "2026-10-05"), "2026-10-05")).toBe(5);
    expect(currentStreak([cycle], dates("2026-10-01", "2026-10-03"), "2026-10-04")).toBe(4);
  });

  it("stops at the day before the goal existed", () => {
    expect(currentStreak([cycle], dates("2026-10-01"), "2026-10-02")).toBe(2);
  });

  it("a missed day breaks the streak", () => {
    // 10-03 missed: streak is 10-04 and 10-05.
    expect(currentStreak([cycle], dates("2026-10-01", "2026-10-05"), "2026-10-05")).toBe(2);
  });

  it("counts only the rest day after a miss when today is pending", () => {
    expect(currentStreak([cycle], dates("2026-10-01"), "2026-10-05")).toBe(1);
  });
});

describe("longestStreak", () => {
  it("returns 0 with no goals", () => {
    expect(longestStreak([], dates(), "2026-10-10")).toBe(0);
  });

  it("finds the longest run across a break", () => {
    // 10-01 T, 10-02 R, 10-03 missed, 10-04 R, 10-05 T, 10-06 R, 10-07 T, 10-08 R.
    const done = dates("2026-10-01", "2026-10-05", "2026-10-07");
    expect(longestStreak([cycle], done, "2026-10-08")).toBe(5);
    expect(currentStreak([cycle], done, "2026-10-08")).toBe(5);
  });

  it("is at least the current streak and ignores a pending today", () => {
    const done = dates("2026-10-01", "2026-10-03");
    expect(longestStreak([cycle], done, "2026-10-05")).toBe(4);
    expect(longestStreak([cycle], done, "2026-10-05")).toBeGreaterThanOrEqual(
      currentStreak([cycle], done, "2026-10-05"),
    );
  });

  it("handles a few years efficiently", () => {
    const long: Goal = { ...cycle, start_date: "2022-01-01" };
    expect(longestStreak([long], dates(), "2026-01-01")).toBe(1); // training days are never done
  });
});
