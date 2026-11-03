import { describe, expect, it } from "vitest";
import type { StoredGoal } from "./queries";
import { activeGoal, plannedTemplateFor } from "./today";

const fixed: StoredGoal = {
  id: "g1",
  type: "fixed_days",
  training_weekdays: [0, 2],
  start_date: "2026-10-01",
  end_date: null,
  dayTemplates: [{ weekday: 0, templateId: "t-legs", templateName: "רגליים" }],
};

describe("plannedTemplateFor", () => {
  it("returns the plan assigned to the weekday", () => {
    expect(plannedTemplateFor([fixed], "2026-11-01")).toEqual({ id: "t-legs", name: "רגליים" }); // Sunday
  });

  it("returns null on a training day without a plan, a rest day, or before the goal", () => {
    expect(plannedTemplateFor([fixed], "2026-11-03")).toBeNull(); // Tuesday, no plan
    expect(plannedTemplateFor([fixed], "2026-11-02")).toBeNull(); // Monday, rest
    expect(plannedTemplateFor([fixed], "2026-09-27")).toBeNull(); // before the goal
  });

  it("ignores cycle goals", () => {
    const cycle: StoredGoal = { id: "g2", type: "cycle", cycle_on: 1, cycle_off: 1, start_date: "2026-10-01", end_date: null, dayTemplates: [] };
    expect(plannedTemplateFor([cycle], "2026-11-01")).toBeNull();
  });
});

describe("activeGoal", () => {
  it("is the goal without an end date", () => {
    const old = { ...fixed, id: "old", end_date: "2026-09-30", start_date: "2026-09-01" };
    expect(activeGoal([old, fixed])?.id).toBe("g1");
    expect(activeGoal([old])).toBeNull();
  });
});
