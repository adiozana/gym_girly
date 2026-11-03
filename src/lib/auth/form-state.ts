import type { z } from "zod";
import { strings } from "@/lib/strings";

const { errors } = strings.auth;

export type AuthField = "email" | "password";

export type AuthFormState = {
  fieldErrors?: Partial<Record<AuthField, string>>;
  formError?: string;
  // Echoed back so the form keeps the typed email after a failed submit.
  email?: string;
};

// Accounts made before email sign-in have an internal email derived from their username.
export const AUTH_EMAIL_DOMAIN = "users.gymtracker.local";

export function usernameToEmail(username: string): string {
  return `${username}@${AUTH_EMAIL_DOMAIN}`;
}

// What the sign-in field holds: an email, or (older accounts) a username.
export function toAuthEmail(identifier: string): string {
  const value = identifier.trim().toLowerCase();
  return value.includes("@") ? value : usernameToEmail(value);
}

export function fromValidationError(error: z.ZodError, email: string): AuthFormState {
  const fieldErrors: Partial<Record<AuthField, string>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if ((field === "email" || field === "password") && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }
  return { fieldErrors, email };
}

// Maps Supabase Auth error codes to Hebrew messages.
export function fromAuthErrorCode(code: string | undefined, email: string): AuthFormState {
  switch (code) {
    case "user_already_exists":
    case "email_exists":
      return { fieldErrors: { email: errors.emailTaken }, email };
    case "email_address_invalid":
      return { fieldErrors: { email: errors.emailInvalid }, email };
    case "invalid_credentials":
      return { formError: errors.invalidCredentials, email };
    case "weak_password":
      return { fieldErrors: { password: errors.passwordTooShort }, email };
    default:
      return { formError: errors.generic, email };
  }
}
