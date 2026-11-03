import { describe, expect, it } from "vitest";
import { inMonth, monthGrid, monthOf, shiftMonth } from "./calendar";

describe("monthGrid", () => {
  it("starts weeks on Sunday and pads days outside the month", () => {
    // November 2026 starts on a Sunday and has 30 days → 5 weeks.
    const grid = monthGrid({ year: 2026, month: 10 });
    expect(grid).toHaveLength(5);
    expect(grid[0][0]).toBe("2026-11-01");
    expect(grid[4][1]).toBe("2026-11-30");
    expect(grid[4][2]).toBeNull();
  });

  it("pads the first week before the 1st", () => {
    // October 2026 starts on a Thursday.
    const grid = monthGrid({ year: 2026, month: 9 });
    expect(grid[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(grid[0][4]).toBe("2026-10-01");
    expect(grid.flat().filter(Boolean)).toHaveLength(31);
  });
});

describe("month helpers", () => {
  it("shifts across years", () => {
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
  });

  it("knows which month a date is in", () => {
    expect(monthOf("2026-11-02")).toEqual({ year: 2026, month: 10 });
    expect(inMonth("2026-11-30", { year: 2026, month: 10 })).toBe(true);
    expect(inMonth("2026-12-01", { year: 2026, month: 10 })).toBe(false);
  });
});
