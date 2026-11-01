import { describe, expect, it } from "vitest";
import { strings } from "@/lib/strings";
import { exerciseInputSchema } from "./exercises";
import { templateExerciseSettingsSchema, templateNameSchema } from "./plans";

const { editor } = strings.plans;

describe("templateNameSchema", () => {
  it("trims and requires a name", () => {
    expect(templateNameSchema.parse("  רגליים ")).toBe("רגליים");
    expect(templateNameSchema.safeParse("   ").error?.issues[0]?.message).toBe(strings.plans.nameRequired);
  });
});

describe("templateExerciseSettingsSchema", () => {
  const base = { planned_sets: 3, rep_range_min: null, rep_range_max: null, note: "", target_weight_kg: null };

  it("accepts settings without a rep range and turns an empty note into null", () => {
    expect(templateExerciseSettingsSchema.parse(base)).toEqual({ ...base, note: null });
  });

  it("keeps planned sets between 1 and 10", () => {
    expect(templateExerciseSettingsSchema.safeParse({ ...base, planned_sets: 0 }).success).toBe(false);
    expect(templateExerciseSettingsSchema.safeParse({ ...base, planned_sets: 11 }).success).toBe(false);
    expect(templateExerciseSettingsSchema.safeParse({ ...base, planned_sets: 10 }).success).toBe(true);
  });

  it("treats a single rep value as an exact count", () => {
    expect(templateExerciseSettingsSchema.parse({ ...base, rep_range_min: 10 })).toMatchObject({
      rep_range_min: 10,
      rep_range_max: 10,
    });
    expect(templateExerciseSettingsSchema.parse({ ...base, rep_range_max: 6 })).toMatchObject({
      rep_range_min: 6,
      rep_range_max: 6,
    });
  });

  it("rejects min above max", () => {
    const result = templateExerciseSettingsSchema.safeParse({ ...base, rep_range_min: 12, rep_range_max: 8 });
    expect(result.error?.issues[0]?.message).toBe(editor.repRangeInvalid);
  });

  it("rejects non-integer and out-of-range rep values", () => {
    expect(templateExerciseSettingsSchema.safeParse({ ...base, rep_range_min: 8.5 }).success).toBe(false);
    expect(templateExerciseSettingsSchema.safeParse({ ...base, rep_range_min: 0 }).success).toBe(false);
    expect(templateExerciseSettingsSchema.safeParse({ ...base, rep_range_max: 1000 }).success).toBe(false);
  });
});

describe("exerciseInputSchema", () => {
  it("requires a Hebrew name, muscle group and equipment", () => {
    const result = exerciseInputSchema.safeParse({ name_he: " " });
    const messages = result.error?.issues.map((i) => i.message);
    expect(messages).toEqual([
      strings.exercises.form.nameRequired,
      strings.exercises.form.muscleRequired,
      strings.exercises.form.equipmentRequired,
    ]);
  });

  it("normalizes optional fields to null", () => {
    expect(
      exerciseInputSchema.parse({
        name_he: " לחיצה ",
        name_en: "",
        muscle_group: "chest",
        equipment: "machine",
        instructions_he: "  ",
      }),
    ).toEqual({
      name_he: "לחיצה",
      name_en: null,
      muscle_group: "chest",
      equipment: "machine",
      instructions_he: null,
    });
  });
});
