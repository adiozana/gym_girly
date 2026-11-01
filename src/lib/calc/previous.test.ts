import { describe, expect, it } from "vitest";
import { findPreviousPerformance, suggestionForSet, type HistoryEntry } from "./previous";

const set = (n: number, weight: number | null, reps: number | null, done = true) => ({
  set_number: n,
  weight_kg: weight,
  reps,
  is_done: done,
});

function entry(partial: Partial<HistoryEntry> & Pick<HistoryEntry, "sessionId" | "startedAt">): HistoryEntry {
  return { status: "completed", position: 0, note: null, sets: [set(1, 50, 8)], ...partial };
}

describe("findPreviousPerformance", () => {
  it("returns the most recent completed session", () => {
    const result = findPreviousPerformance([
      entry({ sessionId: "a", startedAt: "2026-01-01T10:00:00Z" }),
      entry({ sessionId: "b", startedAt: "2026-01-05T10:00:00Z", note: "heavy" }),
    ]);
    expect(result?.sessionId).toBe("b");
    expect(result?.note).toBe("heavy");
  });

  it("ignores an open session that is newer", () => {
    const result = findPreviousPerformance([
      entry({ sessionId: "a", startedAt: "2026-01-01T10:00:00Z" }),
      entry({ sessionId: "open", startedAt: "2026-01-09T10:00:00Z", status: "in_progress" }),
    ]);
    expect(result?.sessionId).toBe("a");
  });

  it("ignores the excluded session", () => {
    const entries = [
      entry({ sessionId: "a", startedAt: "2026-01-01T10:00:00Z" }),
      entry({ sessionId: "b", startedAt: "2026-01-05T10:00:00Z" }),
    ];
    expect(findPreviousPerformance(entries, "b")?.sessionId).toBe("a");
    expect(findPreviousPerformance([entries[1]], "b")).toBeNull();
  });

  it("uses the lowest position when the exercise appears twice", () => {
    const result = findPreviousPerformance([
      entry({ sessionId: "a", startedAt: "2026-01-01T10:00:00Z", position: 3, sets: [set(1, 30, 10)] }),
      entry({ sessionId: "a", startedAt: "2026-01-01T10:00:00Z", position: 1, sets: [set(1, 60, 5)] }),
    ]);
    expect(result?.sets[0].weight_kg).toBe(60);
  });

  it("keeps only done sets with reps, sorted by set number", () => {
    const result = findPreviousPerformance([
      entry({
        sessionId: "a",
        startedAt: "2026-01-01T10:00:00Z",
        sets: [set(3, 50, 6), set(2, 50, 7, false), set(1, 50, 8), set(4, 50, null)],
      }),
    ]);
    expect(result?.sets.map((s) => s.set_number)).toEqual([1, 3]);
  });

  it("returns null with no entries or no done sets", () => {
    expect(findPreviousPerformance([])).toBeNull();
    expect(
      findPreviousPerformance([
        entry({ sessionId: "a", startedAt: "2026-01-01T10:00:00Z", sets: [set(1, 50, 8, false)] }),
      ]),
    ).toBeNull();
  });

  it("keeps history separate per exercise (alternatives)", () => {
    const main = [entry({ sessionId: "s1", startedAt: "2026-01-01T10:00:00Z", sets: [set(1, 80, 5)] })];
    const alt = [entry({ sessionId: "s2", startedAt: "2026-01-08T10:00:00Z", sets: [set(1, 70, 6)] })];
    expect(findPreviousPerformance(main)?.sessionId).toBe("s1");
    expect(findPreviousPerformance(alt)?.sessionId).toBe("s2");
    expect(findPreviousPerformance(alt)?.sets[0].weight_kg).toBe(70);
  });
});

describe("suggestionForSet", () => {
  const sets4 = (n: number) =>
    findPreviousPerformance([
      entry({
        sessionId: "a",
        startedAt: "2026-01-01T10:00:00Z",
        sets: Array.from({ length: n }, (_, i) => set(i + 1, 50 + i, 8)),
      }),
    ]);

  it("matches by set number when previous had more sets", () => {
    const prev = sets4(4);
    expect(suggestionForSet(prev, 2)).toEqual({ weight_kg: 51, reps: 8 });
    expect(suggestionForSet(prev, 3)).toEqual({ weight_kg: 52, reps: 8 });
  });

  it("returns null for set 4 when previous had 3", () => {
    const prev = sets4(3);
    expect(suggestionForSet(prev, 3)).not.toBeNull();
    expect(suggestionForSet(prev, 4)).toBeNull();
  });

  it("returns null without previous performance", () => {
    expect(suggestionForSet(null, 1)).toBeNull();
  });
});
