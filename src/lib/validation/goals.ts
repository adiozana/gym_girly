import { z } from "zod";
import { idSchema } from "./common";

// The device's local date (SPEC.md: "today" follows the browser's time zone).
export const localDateSchema = z.iso.date();

export const goalInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("fixed_days"),
    training_weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    // Optional plan per training weekday ("0".."6" → template id).
    day_templates: z.record(z.string().regex(/^[0-6]$/), idSchema).default({}),
  }),
  z.object({
    type: z.literal("cycle"),
    cycle_on: z.number().int().min(1).max(14),
    cycle_off: z.number().int().min(0).max(14),
  }),
]);

export type GoalInput = z.input<typeof goalInputSchema>;

export const challengeWeeksSchema = z.number().int().min(1).max(52);
