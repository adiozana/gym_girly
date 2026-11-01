import type { z } from "zod";
import { strings } from "@/lib/strings";

// What every Server Action returns, so the UI can show a field error, a toast or roll back.
export type ActionResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string = strings.errors.generic): ActionResult<never> {
  return { ok: false, error };
}

export function invalid(error: z.ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    fieldErrors[field] ??= issue.message;
  }
  return { ok: false, error: error.issues[0]?.message ?? strings.errors.generic, fieldErrors };
}
