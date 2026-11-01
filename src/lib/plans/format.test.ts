import { describe, expect, it } from "vitest";
import { formatPlannedSets } from "./format";

describe("formatPlannedSets", () => {
  it("shows sets and a rep range", () => {
    expect(formatPlannedSets(3, 8, 12)).toBe("3 × 8–12");
  });

  it("shows a single rep count when min equals max or one end is missing", () => {
    expect(formatPlannedSets(4, 10, 10)).toBe("4 × 10");
    expect(formatPlannedSets(4, 10, null)).toBe("4 × 10");
    expect(formatPlannedSets(4, null, 6)).toBe("4 × 6");
  });

  it("shows only the number of sets without a rep range", () => {
    expect(formatPlannedSets(3, null, null)).toBe("3 סטים");
    expect(formatPlannedSets(1, null, null)).toBe("סט אחד");
  });
});
