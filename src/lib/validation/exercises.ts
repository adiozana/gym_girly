import { z } from "zod";
import { EQUIPMENT, MUSCLE_GROUPS } from "@/lib/exercises/types";
import { strings } from "@/lib/strings";
import { optionalText } from "./common";

const { form } = strings.exercises;

// A personal exercise (SPEC.md: Hebrew name required, the rest optional).
export const exerciseInputSchema = z.object({
  name_he: z
    .string()
    .trim()
    .min(1, { error: form.nameRequired })
    .max(80, { error: form.nameTooLong }),
  name_en: optionalText(80, form.nameTooLong),
  muscle_group: z.enum(MUSCLE_GROUPS, { error: form.muscleRequired }),
  equipment: z.enum(EQUIPMENT, { error: form.equipmentRequired }),
  instructions_he: optionalText(1000, form.instructionsTooLong),
});

export type ExerciseInput = z.infer<typeof exerciseInputSchema>;
