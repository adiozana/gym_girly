import { z } from "zod";
import { strings } from "@/lib/strings";

const { errors } = strings.auth;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, { error: errors.emailRequired })
  .pipe(z.email({ error: errors.emailInvalid }));

export const signUpSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, { error: errors.passwordTooShort }),
});

// Sign-in also accepts a username, for accounts made before email sign-in (see toAuthEmail).
// It doesn't enforce the password policy: a wrong password is just a wrong password.
export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, { error: errors.emailRequired }),
  password: z.string().min(1, { error: errors.passwordRequired }),
});

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, { error: strings.welcome.nameRequired })
  .max(40, { error: strings.welcome.nameTooLong });

export type Credentials = z.infer<typeof signUpSchema>;
