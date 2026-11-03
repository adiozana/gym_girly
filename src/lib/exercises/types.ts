import { Constants, type Database } from "@/lib/supabase/database.types";

export type MuscleGroup = Database["public"]["Enums"]["muscle_group"];
export type Equipment = Database["public"]["Enums"]["equipment"];

// The order categories appear in (library filters, the exercise form). Reorder the lines freely;
// every group from the database must be listed once (checked by types.test.ts).
export const MUSCLE_GROUPS = [
  "warmup", // חימום
  "chest", // חזה
  "back", // גב
  "shoulders", // כתפיים
  "biceps", // יד קדמית
  "triceps", // יד אחורית
  "forearms", // אמות
  "legs", // רגליים
  "glutes", // ישבן
  "core", // בטן
  "full_body", // גוף מלא
  "cardio", // אירובי
  "stretching", // מתיחות
] as const satisfies readonly MuscleGroup[];

export const EQUIPMENT = Constants.public.Enums.equipment;

// The fields the library list, picker and filters need.
export type ExerciseSummary = {
  id: string;
  name_he: string;
  name_en: string | null;
  muscle_group: MuscleGroup;
  equipment: Equipment;
  is_personal: boolean;
};
