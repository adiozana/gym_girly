import { describe, expect, it } from "vitest";
import type { PreviousPerformance } from "@/lib/calc";
import { formatElapsed } from "./format";
import {
  canSwap,
  countDoneExercises,
  countUndoneExercises,
  defaultSetCount,
  markDone,
  originalExercise,
  renumberCards,
  suggestionFor,
  swapExercise,
  toExerciseRow,
  toSetsRow,
  withPrevious,
  withSetCount,
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
    { set_number: 2, weight_kg: 40, reps: 10 },
  ],
};

const plan = { planned_sets: 4, rep_range_min: 8, rep_range_max: 12, target_weight_kg: 45 };

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
    setIds: ["s1", "s2", "s3"],
    weight: "",
    reps: "",
    done: false,
    ...overrides,
  };
}

describe("suggestionFor", () => {
  it("has no suggestion without a plan or history", () => {
    expect(suggestionFor(card())).toBeNull();
  });

  it("uses the plan's weight and rep range minimum for the plan's own exercise", () => {
    expect(suggestionFor(card({ plan }))).toEqual({ weight_kg: 45, reps: 8 });
  });

  it("prefers last time's reps, but the plan's weight, for the plan's own exercise", () => {
    expect(suggestionFor(withPrevious(card({ plan }), previous))).toEqual({ weight_kg: 45, reps: 10 });
  });

  it("uses last time's weight when the plan has none", () => {
    const noWeight = { ...plan, target_weight_kg: null };
    expect(suggestionFor(withPrevious(card({ plan: noWeight }), previous))).toEqual({ weight_kg: 40, reps: 10 });
  });

  it("ignores the plan's weight for a swapped exercise and uses last time's", () => {
    const swapped = card({ plan, exercise: dumbbell, replaced: press });
    expect(suggestionFor(swapped)).toEqual({ weight_kg: null, reps: 8 });
    expect(suggestionFor(withPrevious(swapped, previous))).toEqual({ weight_kg: 40, reps: 10 });
  });

  it("uses last time's values without a plan", () => {
    expect(suggestionFor(withPrevious(card(), previous))).toEqual({ weight_kg: 40, reps: 10 });
  });

  it("falls back to the plan's weight with no reps known", () => {
    const noRange = { ...plan, rep_range_min: null };
    expect(suggestionFor(card({ plan: noRange }))).toEqual({ weight_kg: 45, reps: 0 });
  });
});

describe("defaultSetCount", () => {
  it("is the plan's, else last time's, else 3", () => {
    expect(defaultSetCount(plan, previous)).toBe(4);
    expect(defaultSetCount(null, previous)).toBe(2);
    expect(defaultSetCount(null, null)).toBe(3);
    expect(defaultSetCount(null, { ...previous, sets: [] })).toBe(3);
  });
});

describe("withSetCount", () => {
  let n = 0;
  const newId = () => `n${++n}`;

  it("adds new ids and keeps the existing ones", () => {
    n = 0;
    expect(withSetCount(card(), 5, newId).setIds).toEqual(["s1", "s2", "s3", "n1", "n2"]);
  });

  it("removes sets from the end", () => {
    expect(withSetCount(card(), 1, newId).setIds).toEqual(["s1"]);
  });

  it("clamps to 1..10", () => {
    expect(withSetCount(card(), 0, newId).setIds).toEqual(["s1"]);
    expect(withSetCount(card(), 99, newId).setIds).toHaveLength(10);
  });
});

describe("swapExercise", () => {
  it("records the original, clears the typed values and the history", () => {
    const c = withPrevious(card({ weight: "40", reps: "10" }), previous);
    const swapped = swapExercise(c, dumbbell);
    expect(swapped.exercise.id).toBe("e2");
    expect(swapped.replaced?.id).toBe("e1");
    expect(swapped.previous).toBeNull();
    expect(swapped).toMatchObject({ weight: "", reps: "" });
  });

  it("keeps the very first original when swapped twice, and reverting clears it", () => {
    const twice = swapExercise(swapExercise(card(), dumbbell), barbell);
    expect(twice.replaced?.id).toBe("e1");
    expect(originalExercise(twice).id).toBe("e1");
    const reverted = swapExercise(twice, press);
    expect(reverted.exercise.id).toBe("e1");
    expect(reverted.replaced).toBeNull();
  });

  it("is allowed only while the exercise isn't done", () => {
    expect(canSwap(card())).toBe(true);
    expect(canSwap(card({ done: true }))).toBe(false);
  });
});

describe("rows and counts", () => {
  it("marking done shows the copied values as entered", () => {
    const done = markDone(card(), { weight_kg: 42.5, reps: 9 });
    expect(done).toMatchObject({ done: true, weight: "42.5", reps: "9" });
    expect(toSetsRow(done)).toEqual({
      sessionExerciseId: "c1",
      setIds: ["s1", "s2", "s3"],
      weight_kg: 42.5,
      reps: 9,
      is_done: true,
    });
  });

  it("marking done without a weight (bodyweight) leaves it empty", () => {
    expect(markDone(card(), { weight_kg: null, reps: 12 })).toMatchObject({ weight: "", reps: "12" });
  });

  it("an untouched exercise is written with empty values", () => {
    expect(toSetsRow(card())).toMatchObject({ weight_kg: null, reps: null, is_done: false });
  });

  it("builds the session_exercises row", () => {
    const swapped = swapExercise(card({ note: "מושב 4", position: 2 }), dumbbell);
    expect(toExerciseRow(swapped)).toEqual({
      id: "c1",
      exercise_id: "e2",
      replaced_exercise_id: "e1",
      template_exercise_id: "te1",
      position: 2,
      note: "מושב 4",
    });
    expect(toExerciseRow(card()).replaced_exercise_id).toBeNull();
  });

  it("counts done and undone exercises and renumbers positions", () => {
    const cards = [card({ done: true }), card({ id: "c2", position: 5 }), card({ id: "c3", position: 9 })];
    expect(countUndoneExercises(cards)).toBe(2);
    expect(countDoneExercises(cards)).toBe(1);
    expect(renumberCards(cards).map((c) => c.position)).toEqual([1, 2, 3]);
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
