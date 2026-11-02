import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatDayAndDate } from "./format-date";

describe("date formatting", () => {
  it("uses DD/MM/YYYY for calendar dates and timestamps", () => {
    expect(formatDate("2026-11-02")).toBe("02/11/2026");
    expect(formatDate(new Date(2026, 0, 5, 23, 59))).toBe("05/01/2026");
  });

  it("adds 24-hour time", () => {
    expect(formatDateTime(new Date(2026, 10, 2, 18, 5))).toBe("02/11/2026 · 18:05");
  });

  it("adds the Hebrew weekday", () => {
    expect(formatDayAndDate("2026-11-02")).toBe("יום ב׳ · 02/11/2026");
  });
});
