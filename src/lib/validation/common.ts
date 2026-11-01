import { z } from "zod";

export const idSchema = z.uuid();

// Optional text from a form: trimmed, and empty becomes null.
export function optionalText(max: number, tooLong: string) {
  return z
    .string()
    .trim()
    .max(max, { error: tooLong })
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional()
    .transform((value) => value ?? null);
}
