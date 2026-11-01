import { describe, expect, it } from "vitest";
import { getDayStatus, goalForDate, isCompliant, isTrainingDay, type Goal } from "./day-status";

// 2026-11-01 is a Sunday.
const fixed: Goal = {
  type: "fixed_days",
  training_weekdays: [0, 2],
  start_date: "2026-10-01",
  end_date: null,
};
const cycle: Goal = { type: "cycle", cycle_on: 2, cycle_off: 1, start_date: "2026-10-01", end_date: null };
const none = new Set<string>();

describe("goalForDate", () => {
  it("respects start and end dates", () => {
    const old: Goal = { ...fixed, end_date: "2026-10-14" };
    const next: Goal = { ...cycle, start_date: "2026-10-15" };
    expect(goalForDate("2026-09-30", [old, next])).toBeNull();
    expect(goalForDate("2026-10-14", [old, next])).toBe(old);
    expect(goalForDate("2026-10-15", [old, next])).toBe(next);
    expect(goalForDate("2027-01-01", [old, next])).toBe(next);
  });
});

describe("isTrainingDay", () => {
  it("fixed days use the weekday", () => {
    expect(isTrainingDay(fixed, "2026-11-01")).toBe(true); // Sunday
    expect(isTrainingDay(fixed, "2026-11-02")).toBe(false); // Monday
    expect(isTrainingDay(fixed, "2026-11-03")).toBe(true); // Tuesday
  });
  it("cycle repeats on/off from start_date", () => {
    expect(isTrainingDay(cycle, "2026-10-01")).toBe(true);
    expect(isTrainingDay(cycle, "2026-10-02")).toBe(true);
    expect(isTrainingDay(cycle, "2026-10-03")).toBe(false);
    expect(isTrainingDay(cycle, "2026-10-04")).toBe(true);
  });
});

describe("getDayStatus", () => {
  const today = "2026-11-01";

  it("is no_goal before any goal and with no goals, also in the future", () => {
    expect(getDayStatus("2026-09-01", [fixed], none, today)).toBe("no_goal");
    expect(getDayStatus("2026-11-05", [], none, today)).toBe("no_goal");
  });

  it("marks past training days trained or missed", () => {
    expect(getDayStatus("2026-10-27", [fixed], new Set(["2026-10-27"]), today)).toBe("trained");
    expect(getDayStatus("2026-10-27", [fixed], none, today)).toBe("missed");
  });

  it("rest stays rest even when trained", () => {
    expect(getDayStatus("2026-10-28", [fixed], none, today)).toBe("rest");
    expect(getDayStatus("2026-10-28", [fixed], new Set(["2026-10-28"]), today)).toBe("rest");
  });

  it("today is pending until a session is completed", () => {
    expect(getDayStatus(today, [fixed], none, today)).toBe("pending");
    expect(getDayStatus(today, [fixed], new Set([today]), today)).toBe("trained");
  });

  it("future days are planned", () => {
    expect(getDayStatus("2026-11-03", [fixed], none, today)).toBe("planned_training");
    expect(getDayStatus("2026-11-04", [fixed], none, today)).toBe("planned_rest");
  });

  it("judges each day by the goal in effect after a goal change", () => {
    const old: Goal = { ...fixed, end_date: "2026-10-14" };
    const next: Goal = { ...cycle, start_date: "2026-10-15" };
    // 2026-10-13 is a Tuesday: training under the old goal.
    expect(getDayStatus("2026-10-13", [old, next], none, today)).toBe("missed");
    // Cycle day 0 and 1 train, day 2 rests.
    expect(getDayStatus("2026-10-15", [old, next], none, today)).toBe("missed");
    expect(getDayStatus("2026-10-17", [old, next], none, today)).toBe("rest");
  });
});

describe("isCompliant", () => {
  it("is true only for trained and rest", () => {
    expect(isCompliant("trained")).toBe(true);
    expect(isCompliant("rest")).toBe(true);
    for (const s of ["missed", "no_goal", "pending", "planned_rest", "planned_training"] as const) {
      expect(isCompliant(s)).toBe(false);
    }
  });
});
