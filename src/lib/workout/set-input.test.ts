import { describe, expect, it } from "vitest";
import {
  checkDone,
  formatWeight,
  isWeightOptional,
  parseReps,
  parseWeight,
  sanitizeRepsInput,
  sanitizeWeightInput,
} from "./set-input";

describe("sanitizeWeightInput", () => {
  it("accepts digits with up to two decimals", () => {
    expect(sanitizeWeightInput("60")).toBe("60");
    expect(sanitizeWeightInput("2.5")).toBe("2.5");
    expect(sanitizeWeightInput("1.25")).toBe("1.25");
    expect(sanitizeWeightInput("")).toBe("");
    expect(sanitizeWeightInput("2.")).toBe("2.");
  });

  it("turns a comma decimal separator into a dot", () => {
    expect(sanitizeWeightInput("2,5")).toBe("2.5");
    expect(sanitizeWeightInput("12,")).toBe("12.");
  });

  it("rejects a third decimal, a fifth integer digit, signs and letters", () => {
    expect(sanitizeWeightInput("1.255")).toBeNull();
    expect(sanitizeWeightInput("10000")).toBeNull();
    expect(sanitizeWeightInput("-5")).toBeNull();
    expect(sanitizeWeightInput("5kg")).toBeNull();
    expect(sanitizeWeightInput("1.2.3")).toBeNull();
  });
});

describe("parseWeight", () => {
  it("parses dot and comma decimals", () => {
    expect(parseWeight("62.5")).toBe(62.5);
    expect(parseWeight("62,5")).toBe(62.5);
    expect(parseWeight("1.25")).toBe(1.25);
    expect(parseWeight("2.")).toBe(2);
    expect(parseWeight("0")).toBe(0);
  });

  it("returns null for empty or invalid text", () => {
    expect(parseWeight("")).toBeNull();
    expect(parseWeight(".")).toBeNull();
    expect(parseWeight("abc")).toBeNull();
    expect(parseWeight("1.234")).toBeNull();
  });

  it("allows the maximum", () => {
    expect(parseWeight("9999.99")).toBe(9999.99);
  });
});

describe("reps", () => {
  it("accepts up to three digits", () => {
    expect(sanitizeRepsInput("12")).toBe("12");
    expect(sanitizeRepsInput("999")).toBe("999");
    expect(sanitizeRepsInput("1000")).toBeNull();
    expect(sanitizeRepsInput("1.5")).toBeNull();
    expect(parseReps("8")).toBe(8);
    expect(parseReps("")).toBeNull();
    expect(parseReps("0")).toBe(0);
  });
});

describe("formatWeight", () => {
  it("drops trailing zeros", () => {
    expect(formatWeight(60)).toBe("60");
    expect(formatWeight(2.5)).toBe("2.5");
    expect(formatWeight(1.25)).toBe("1.25");
    expect(formatWeight(null)).toBe("");
  });
});

describe("checkDone", () => {
  const suggestion = { weight_kg: 60, reps: 8 };

  it("copies the suggestion into untouched fields (one tap for an identical set)", () => {
    expect(checkDone({ weight: "", reps: "", suggestion }, "machine")).toEqual({ ok: true, weight_kg: 60, reps: 8 });
  });

  it("uses typed values over the suggestion", () => {
    expect(checkDone({ weight: "62,5", reps: "6", suggestion }, "machine")).toEqual({
      ok: true,
      weight_kg: 62.5,
      reps: 6,
    });
    expect(checkDone({ weight: "", reps: "10", suggestion }, "machine")).toEqual({ ok: true, weight_kg: 60, reps: 10 });
  });

  it("rejects zero or missing reps", () => {
    expect(checkDone({ weight: "60", reps: "0", suggestion: null }, "machine")).toEqual({ ok: false, error: "reps" });
    expect(checkDone({ weight: "60", reps: "", suggestion: null }, "machine")).toEqual({ ok: false, error: "reps" });
    expect(checkDone({ weight: "60", reps: "0", suggestion }, "machine")).toEqual({ ok: false, error: "reps" });
  });

  it("requires a weight unless the equipment has no load", () => {
    expect(checkDone({ weight: "", reps: "8", suggestion: null }, "dumbbell")).toEqual({ ok: false, error: "weight" });
    expect(checkDone({ weight: "", reps: "12", suggestion: null }, "bodyweight")).toEqual({
      ok: true,
      weight_kg: null,
      reps: 12,
    });
    expect(checkDone({ weight: "", reps: "12", suggestion: null }, "band").ok).toBe(true);
    expect(checkDone({ weight: "", reps: "12", suggestion: null }, "other").ok).toBe(true);
  });

  it("accepts a zero weight", () => {
    expect(checkDone({ weight: "0", reps: "5", suggestion: null }, "machine")).toEqual({ ok: true, weight_kg: 0, reps: 5 });
  });

  it("knows which equipment makes the weight optional", () => {
    expect(isWeightOptional("bodyweight")).toBe(true);
    expect(isWeightOptional("barbell")).toBe(false);
  });
});
