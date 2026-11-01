import { z } from "zod";
import { strings } from "@/lib/strings";
import { idSchema, optionalText } from "./common";

const { plans } = strings;
const { editor } = plans;

export const templateNameSchema = z
  .string()
  .trim()
  .min(1, { error: plans.nameRequired })
  .max(60, { error: plans.nameTooLong });

const repValue = z
  .number({ error: editor.repValueInvalid })
  .int({ error: editor.repValueInvalid })
  .min(1, { error: editor.repValueInvalid })
  .max(999, { error: editor.repValueInvalid })
  .nullable();

// Settings of one exercise inside a template. A single rep value means an exact count.
export const templateExerciseSettingsSchema = z
  .object({
    planned_sets: z.number().int().min(1).max(10),
    rep_range_min: repValue,
    rep_range_max: repValue,
    note: optionalText(300, editor.noteTooLong),
  })
  .transform((settings) => {
    const { rep_range_min: min, rep_range_max: max } = settings;
    if (min != null && max == null) return { ...settings, rep_range_max: min };
    if (max != null && min == null) return { ...settings, rep_range_min: max };
    return settings;
  })
  .refine(
    (s) => s.rep_range_min == null || s.rep_range_max == null || s.rep_range_min <= s.rep_range_max,
    { error: editor.repRangeInvalid, path: ["rep_range_max"] },
  );

export type TemplateExerciseSettings = z.infer<typeof templateExerciseSettingsSchema>;

export const reorderSchema = z.object({
  parentId: idSchema,
  orderedIds: z.array(idSchema).min(1),
});
