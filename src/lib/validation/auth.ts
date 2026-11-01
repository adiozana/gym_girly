import { z } from "zod";
import { strings } from "@/lib/strings";

const { errors } = strings.auth;

// Input is trimmed and lower-cased before validation (SPEC.md: usernames are case-insensitive).
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, { error: errors.usernameInvalid });

export const signUpSchema = z.object({
  username: usernameSchema,
  password: z.string().min(8, { error: errors.passwordTooShort }),
});

// Sign-in doesn't enforce the password policy: a wrong password is just a wrong password.
export const signInSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, { error: errors.passwordRequired }),
});

export type Credentials = z.infer<typeof signUpSchema>;
