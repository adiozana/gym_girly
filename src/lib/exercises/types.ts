import { Constants, type Database } from "@/lib/supabase/database.types";

export type MuscleGroup = Database["public"]["Enums"]["muscle_group"];
export type Equipment = Database["public"]["Enums"]["equipment"];

export const MUSCLE_GROUPS = Constants.public.Enums.muscle_group;
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
