import { describe, expect, it } from "vitest";
import { Constants } from "@/lib/supabase/database.types";
import { MUSCLE_GROUPS } from "./types";

describe("MUSCLE_GROUPS", () => {
  it("lists every muscle group from the database exactly once", () => {
    expect([...MUSCLE_GROUPS].sort()).toEqual([...Constants.public.Enums.muscle_group].sort());
  });
});
