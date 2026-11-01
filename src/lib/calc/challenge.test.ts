import { describe, expect, it } from "vitest";
import { evaluateChallenge } from "./challenge";
import type { Goal } from "./day-status";

// Train every day: always compliant when sessions exist, missed otherwise.
const daily: Goal = {
  type: "fixed_days",
  training_weekdays: [0, 1, 2, 3, 4, 5, 6],
  start_date: "2026-09-01",
  end_date: null,
};
const challenge = { weeks: 2, start_date: "2026-10-05" };

function days(from: string, count: number): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T00:00:00Z`);
  for (let i = 0; i < count; i++) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

describe("evaluateChallenge", () => {
  const all = new Set(days("2026-10-05", 14));

  it("computes the end date and totals", () => {
    const r = evaluateChallenge(challenge, [daily], all, "2026-10-05");
    expect(r.endDate).toBe("2026-10-18");
    expect(r.totalDays).toBe(14);
    expect(r.daysElapsed).toBe(0);
  });

  it("succeeds the day after the last day when all days complied", () => {
    const r = evaluateChallenge(challenge, [daily], all, "2026-10-19");
    expect(r.status).toBe("succeeded");
    expect(r.daysElapsed).toBe(14);
    expect(r.weeksCompleted).toBe(2);
    expect(r.failedOn).toBeNull();
  });

  it("stays active on the last day while it is pending", () => {
    const done = new Set(days("2026-10-05", 13));
    const r = evaluateChallenge(challenge, [daily], done, "2026-10-18");
    expect(r.status).toBe("active");
    expect(r.daysElapsed).toBe(13);
    expect(r.weeksCompleted).toBe(1);
  });

  it("fails on the first missed day", () => {
    const done = new Set(days("2026-10-05", 14));
    done.delete("2026-10-08");
    const r = evaluateChallenge(challenge, [daily], done, "2026-10-10");
    expect(r.status).toBe("failed");
    expect(r.failedOn).toBe("2026-10-08");
    expect(r.weeksCompleted).toBe(0);
  });

  it("stays failed after the period ends", () => {
    const done = new Set(days("2026-10-05", 13));
    const r = evaluateChallenge(challenge, [daily], done, "2026-10-25");
    expect(r.status).toBe("failed");
    expect(r.failedOn).toBe("2026-10-18");
  });

  it("fails on a no_goal day inside the period", () => {
    const r = evaluateChallenge(challenge, [{ ...daily, start_date: "2026-10-07" }], all, "2026-10-09");
    expect(r.status).toBe("failed");
    expect(r.failedOn).toBe("2026-10-05");
  });

  it("counts weeks until the first non-compliant block", () => {
    const r = evaluateChallenge({ weeks: 3, start_date: "2026-10-05" }, [daily], new Set(days("2026-10-05", 7)), "2026-10-13");
    expect(r.weeksCompleted).toBe(1);
    expect(r.status).toBe("failed");
  });
});
