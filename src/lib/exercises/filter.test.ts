import { describe, expect, it } from "vitest";
import { filterExercises, matchesQuery, normalizeSearch } from "./filter";
import type { ExerciseSummary } from "./types";

const exercise = (overrides: Partial<ExerciseSummary>): ExerciseSummary => ({
  id: "x",
  name_he: "",
  name_en: null,
  muscle_group: "legs",
  equipment: "machine",
  is_personal: false,
  ...overrides,
});

const library = [
  exercise({ id: "squat", name_he: "סקוואט במוט", name_en: "Barbell Back Squat", equipment: "barbell" }),
  exercise({ id: "press", name_he: "לחיצת רגליים", name_en: "Leg Press" }),
  exercise({ id: "bench", name_he: "לחיצת חזה במוט", name_en: "Barbell Bench Press", muscle_group: "chest", equipment: "barbell" }),
  exercise({ id: "tgu", name_he: "טורקיש גט־אפ", name_en: "Turkish Get-Up", muscle_group: "full_body", equipment: "kettlebell" }),
  exercise({ id: "mine", name_he: "התרגיל שלי", muscle_group: "core", equipment: "other", is_personal: true }),
];

const ids = (list: ExerciseSummary[]) => list.map((e) => e.id);

describe("normalizeSearch", () => {
  it("lower-cases, trims and collapses punctuation and spaces", () => {
    expect(normalizeSearch("  Turkish  Get-Up ")).toBe("turkish get up");
    expect(normalizeSearch("גט־אפ")).toBe("גט אפ");
    expect(normalizeSearch("ת׳ראסטר")).toBe("ת ראסטר");
  });
});

describe("matchesQuery", () => {
  it("matches Hebrew and English names, ignoring case", () => {
    expect(matchesQuery(library[0], "סקוואט")).toBe(true);
    expect(matchesQuery(library[0], "SQUAT")).toBe(true);
    expect(matchesQuery(library[0], "bench")).toBe(false);
  });

  it("requires every word, in any order", () => {
    expect(matchesQuery(library[2], "press bench")).toBe(true);
    expect(matchesQuery(library[2], "press leg")).toBe(false);
  });

  it("ignores maqaf and hyphen differences", () => {
    expect(matchesQuery(library[3], "גט אפ")).toBe(true);
    expect(matchesQuery(library[3], "getup")).toBe(false);
    expect(matchesQuery(library[3], "get up")).toBe(true);
  });

  it("handles exercises without an English name", () => {
    expect(matchesQuery(library[4], "שלי")).toBe(true);
    expect(matchesQuery(library[4], "mine")).toBe(false);
  });

  it("matches everything for an empty query", () => {
    expect(matchesQuery(library[0], "   ")).toBe(true);
  });
});

describe("filterExercises", () => {
  it("returns everything without filters", () => {
    expect(ids(filterExercises(library, {}))).toEqual(ids(library));
  });

  it("filters by muscle group and equipment together", () => {
    expect(ids(filterExercises(library, { muscleGroup: "legs" }))).toEqual(["squat", "press"]);
    expect(ids(filterExercises(library, { equipment: "barbell" }))).toEqual(["squat", "bench"]);
    expect(ids(filterExercises(library, { muscleGroup: "legs", equipment: "barbell" }))).toEqual(["squat"]);
  });

  it("combines the query with the filters", () => {
    expect(ids(filterExercises(library, { query: "לחיצת", muscleGroup: "legs" }))).toEqual(["press"]);
    expect(ids(filterExercises(library, { query: "לחיצת", equipment: "kettlebell" }))).toEqual([]);
  });
});
