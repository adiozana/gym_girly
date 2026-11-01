import { describe, expect, it } from "vitest";
import type { PreviousPerformance } from "@/lib/calc";
import { formatElapsed } from "./format";
import {
  addSet,
  canSwap,
  countUndoneSets,
  emptySet,
  markDone,
  renumberCards,
  setsFromPrevious,
  suggestionFromSetAbove,
  swapExercise,
  toSetRow,
  withPrevious,
} from "./state";
import type { ExerciseInfo, WorkoutCard } from "./types";

const exercise = (id: string, name: string): ExerciseInfo => ({
  id,
  name_he: name,
  name_en: null,
  muscle_group: "chest",
  equipment: "machine",
  is_personal: false,
  instructions_he: null,
});

const press = exercise("e1", "לחיצת חזה במכונה");
const dumbbell = exercise("e2", "לחיצת חזה במשקולות");
const barbell = exercise("e3", "לחיצת חזה במוט");

const previous: PreviousPerformance = {
  sessionId: "s0",
  startedAt: "2026-10-28T17:00:00Z",
  note: "מושב 4",
  sets: [
    { set_number: 1, weight_kg: 40, reps: 10 },
    { set_number: 2, weight_kg: 45, reps: 8 },
  ],
};

function card(overrides: Partial<WorkoutCard> = {}): WorkoutCard {
  return {
    id: "c1",
    position: 1,
    exercise: press,
    replaced: null,
    template_exercise_id: "te1",
    plan: null,
    alternatives: [dumbbell, barbell],
    note: "",
    previous: null,
    sets: [emptySet("s1", 1, null), emptySet("s2", 2, null)],
    ...overrides,
  };
}

describe("addSet", () => {
  it("suggests the values entered in the set above", () => {
    const c = card({ sets: [{ ...emptySet("s1", 1, { weight_kg: 40, reps: 10 }), weight: "42.5", reps: "9" }] });
    const next = addSet(c, "s2");
    expect(next.sets[1]).toMatchObject({ id: "s2", set_number: 2, weight: "", reps: "", suggestion: { weight_kg: 42.5, reps: 9 } });
  });

  it("falls back to the set above's suggestion when nothing was typed", () => {
    const c = card({ sets: [emptySet("s1", 1, { weight_kg: 40, reps: 10 })] });
    expect(addSet(c, "s2").sets[1].suggestion).toEqual({ weight_kg: 40, reps: 10 });
  });

  it("has no suggestion when the set above is empty", () => {
    expect(addSet(card({ sets: [emptySet("s1", 1, null)] }), "s2").sets[1].suggestion).toBeNull();
    expect(suggestionFromSetAbove(undefined)).toBeNull();
  });

  it("numbers the new set after the last one", () => {
    expect(addSet(card(), "s3").sets.map((s) => s.set_number)).toEqual([1, 2, 3]);
  });
});

describe("previous performance", () => {
  it("prefills by set number; a set with no match stays empty", () => {
    const c = withPrevious(card({ sets: [emptySet("s1", 1, null), emptySet("s2", 2, null), emptySet("s3", 3, null)] }), previous);
    expect(c.sets.map((s) => s.suggestion)).toEqual([{ weight_kg: 40, reps: 10 }, { weight_kg: 45, reps: 8 }, null]);
    expect(c.previous?.note).toBe("מושב 4");
  });

  it("creates as many sets as last time, else 3", () => {
    let n = 0;
    const id = () => `id${++n}`;
    expect(setsFromPrevious(previous, id).map((s) => s.suggestion?.weight_kg)).toEqual([40, 45]);
    expect(setsFromPrevious(null, id)).toHaveLength(3);
  });
});

describe("swapExercise", () => {
  it("records the original and clears the typed values", () => {
    const c = withPrevious(card({ sets: [{ ...emptySet("s1", 1, null), weight: "40", reps: "10" }] }), previous);
    const swapped = swapExercise(c, dumbbell);
    expect(swapped.exercise.id).toBe("e2");
    expect(swapped.replaced?.id).toBe("e1");
    expect(swapped.previous).toBeNull();
    expect(swapped.sets[0]).toMatchObject({ weight: "", reps: "", suggestion: null });
  });

  it("keeps the very first original when swapped twice, and reverting clears it", () => {
    const twice = swapExercise(swapExercise(card(), dumbbell), barbell);
    expect(twice.replaced?.id).toBe("e1");
    const reverted = swapExercise(twice, press);
    expect(reverted.exercise.id).toBe("e1");
    expect(reverted.replaced).toBeNull();
  });

  it("is allowed only while no set is done", () => {
    expect(canSwap(card())).toBe(true);
    const done = card({ sets: [markDone(emptySet("s1", 1, null), { weight_kg: 40, reps: 10 })] });
    expect(canSwap(done)).toBe(false);
  });
});

describe("rows and counts", () => {
  it("marking done shows the copied values as entered", () => {
    const set = markDone(emptySet("s1", 1, { weight_kg: 40, reps: 10 }), { weight_kg: 40, reps: 10 });
    expect(set).toMatchObject({ is_done: true, weight: "40", reps: "10" });
    expect(toSetRow("c1", set)).toEqual({
      id: "s1",
      session_exercise_id: "c1",
      set_number: 1,
      weight_kg: 40,
      reps: 10,
      is_done: true,
    });
  });

  it("an untouched set is written with empty values", () => {
    expect(toSetRow("c1", emptySet("s1", 1, { weight_kg: 40, reps: 10 }))).toMatchObject({ weight_kg: null, reps: null });
  });

  it("counts undone sets and renumbers positions", () => {
    const done = markDone(emptySet("s1", 1, null), { weight_kg: 40, reps: 10 });
    const cards = [card({ sets: [done, emptySet("s2", 2, null)] }), card({ id: "c2", position: 5 })];
    expect(countUndoneSets(cards)).toBe(3);
    expect(renumberCards(cards).map((c) => c.position)).toEqual([1, 2]);
  });
});

describe("formatElapsed", () => {
  it("shows m:ss under an hour and h:mm:ss after", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(65_000)).toBe("1:05");
    expect(formatElapsed(59 * 60_000 + 59_999)).toBe("59:59");
    expect(formatElapsed(3_600_000)).toBe("1:00:00");
    expect(formatElapsed(3_600_000 + 5 * 60_000 + 9_000)).toBe("1:05:09");
    expect(formatElapsed(26 * 3_600_000)).toBe("26:00:00");
  });

  it("never shows negative time", () => {
    expect(formatElapsed(-5000)).toBe("0:00");
  });
});
