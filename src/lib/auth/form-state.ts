import type { z } from "zod";
import { strings } from "@/lib/strings";

const { errors } = strings.auth;

export type AuthField = "username" | "password";

export type AuthFormState = {
  fieldErrors?: Partial<Record<AuthField, string>>;
  formError?: string;
  // Echoed back so the form keeps the typed username after a failed submit.
  username?: string;
};

// The user never sees an email; Supabase Auth gets one derived from the username.
export const AUTH_EMAIL_DOMAIN = "users.gymtracker.local";

export function usernameToEmail(username: string): string {
  return `${username}@${AUTH_EMAIL_DOMAIN}`;
}

export function fromValidationError(
  error: z.ZodError,
  username: string,
): AuthFormState {
  const fieldErrors: Partial<Record<AuthField, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if ((field === "username" || field === "password") && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return { fieldErrors, username };
}

// Maps Supabase Auth error codes to Hebrew messages (SPEC.md: "הודעות שגיאה בעברית").
export function fromAuthErrorCode(
  code: string | undefined,
  username: string,
): AuthFormState {
  switch (code) {
    case "user_already_exists":
    case "email_exists":
      return { fieldErrors: { username: errors.usernameTaken }, username };
    case "invalid_credentials":
      return { formError: errors.invalidCredentials, username };
    case "weak_password":
      return { fieldErrors: { password: errors.passwordTooShort }, username };
    default:
      return { formError: errors.generic, username };
  }
}
