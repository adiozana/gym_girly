import { describe, expect, it } from "vitest";
import { parseRepInput } from "./rep-input";

describe("parseRepInput", () => {
  it("treats an empty field as not set", () => {
    expect(parseRepInput("")).toBeNull();
    expect(parseRepInput("  ")).toBeNull();
  });

  it("parses whole numbers from 1 to 999", () => {
    expect(parseRepInput("8")).toBe(8);
    expect(parseRepInput(" 12 ")).toBe(12);
    expect(parseRepInput("999")).toBe(999);
  });

  it("rejects zero, decimals, negatives, text and values over 999", () => {
    for (const text of ["0", "8.5", "-3", "abc", "1000", "1e2"]) {
      expect(parseRepInput(text)).toBe("invalid");
    }
  });
});
