import { describe, expect, it } from "vitest";
import { sanitizeDraft, type DraftResponse } from "./plan-draft";

const known = new Set(["squat", "press", "curl"]);
const response = (exercises: DraftResponse["exercises"], name = "רגליים"): DraftResponse => ({ name, exercises, message: "" });

describe("sanitizeDraft", () => {
  it("keeps known exercises with their settings", () => {
    const { draft, dropped } = sanitizeDraft(
      response([{ exercise_id: "squat", planned_sets: 4, rep_range_min: 6, rep_range_max: 8, target_weight_kg: 60, note: " עומק " }]),
      known,
      "תוכנית",
    );
    expect(dropped).toEqual([]);
    expect(draft).toEqual({
      name: "רגליים",
      exercises: [{ exercise_id: "squat", planned_sets: 4, rep_range_min: 6, rep_range_max: 8, target_weight_kg: 60, note: "עומק" }],
    });
  });

  it("drops unknown and repeated exercises", () => {
    const { draft, dropped } = sanitizeDraft(
      response([{ exercise_id: "squat" }, { exercise_id: "made-up" }, { exercise_id: "squat" }]),
      known,
      "תוכנית",
    );
    expect(draft.exercises.map((e) => e.exercise_id)).toEqual(["squat"]);
    expect(dropped).toEqual(["made-up", "squat"]);
  });

  it("defaults to 3 sets and clamps numbers to the plan's rules", () => {
    const { draft } = sanitizeDraft(
      response([
        { exercise_id: "squat", planned_sets: null },
        { exercise_id: "press", planned_sets: 15, rep_range_min: 12, rep_range_max: 8, target_weight_kg: 62.555 },
        { exercise_id: "curl", planned_sets: 0, rep_range_min: 10, target_weight_kg: -5 },
      ]),
      known,
      "תוכנית",
    );
    expect(draft.exercises[0]).toMatchObject({ planned_sets: 3, rep_range_min: null, rep_range_max: null, target_weight_kg: null });
    expect(draft.exercises[1]).toMatchObject({ planned_sets: 10, rep_range_min: 8, rep_range_max: 12, target_weight_kg: 62.56 });
    expect(draft.exercises[2]).toMatchObject({ planned_sets: 1, rep_range_min: 10, rep_range_max: 10, target_weight_kg: null });
  });

  it("falls back to a default name and trims long ones", () => {
    expect(sanitizeDraft(response([], "  "), known, "תוכנית חדשה").draft.name).toBe("תוכנית חדשה");
    expect(sanitizeDraft(response([], "א".repeat(80)), known, "x").draft.name).toHaveLength(60);
  });
});
