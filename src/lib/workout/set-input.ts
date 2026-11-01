import type { Equipment } from "@/lib/exercises/types";

// Set fields keep the text as typed (so "2." can be on its way to "2.5"); these helpers
// filter keystrokes, parse the text and decide whether a set may be marked done.

export const MAX_WEIGHT_KG = 9999.99;
export const MAX_REPS = 999;

// Up to 4 integer digits and 2 decimals; "," is accepted as the decimal separator.
const WEIGHT_PATTERN = /^\d{0,4}(?:[.,]\d{0,2})?$/;
const REPS_PATTERN = /^\d{0,3}$/;

// Returns the text to show, or null when the keystroke should be ignored.
export function sanitizeWeightInput(text: string): string | null {
  const trimmed = text.trim();
  if (!WEIGHT_PATTERN.test(trimmed)) return null;
  return trimmed.replace(",", ".");
}

export function sanitizeRepsInput(text: string): string | null {
  const trimmed = text.trim();
  return REPS_PATTERN.test(trimmed) ? trimmed : null;
}

// "" or "." → null; "2." → 2; "2,5" → 2.5.
export function parseWeight(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (normalized === "" || normalized === ".") return null;
  if (!WEIGHT_PATTERN.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) && value <= MAX_WEIGHT_KG ? Math.round(value * 100) / 100 : null;
}

export function parseReps(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "" || !REPS_PATTERN.test(trimmed)) return null;
  return Number(trimmed);
}

// 60 → "60", 2.5 → "2.5", 1.25 → "1.25".
export function formatWeight(value: number | null): string {
  return value == null ? "" : String(Math.round(value * 100) / 100);
}

export function formatReps(value: number | null): string {
  return value == null ? "" : String(value);
}

// SPEC.md: weight is optional for bodyweight exercises (empty = bodyweight). Bands and
// "other" have no meaningful load either.
const OPTIONAL_WEIGHT: readonly Equipment[] = ["bodyweight", "band", "other"];

export function isWeightOptional(equipment: Equipment): boolean {
  return OPTIONAL_WEIGHT.includes(equipment);
}

export type SetSuggestion = { weight_kg: number | null; reps: number } | null;

export type DoneCheck =
  | { ok: true; weight_kg: number | null; reps: number }
  | { ok: false; error: "reps" | "weight" };

// Marking done: an untouched field takes the suggestion (one tap for an identical set).
export function checkDone(
  input: { weight: string; reps: string; suggestion: SetSuggestion },
  equipment: Equipment,
): DoneCheck {
  const reps = input.reps.trim() === "" ? (input.suggestion?.reps ?? null) : parseReps(input.reps);
  if (reps == null || reps < 1) return { ok: false, error: "reps" };

  const weight =
    input.weight.trim() === "" ? (input.suggestion?.weight_kg ?? null) : parseWeight(input.weight);
  if (weight == null && !isWeightOptional(equipment)) return { ok: false, error: "weight" };

  return { ok: true, weight_kg: weight, reps };
}
