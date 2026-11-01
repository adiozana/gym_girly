"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";
import {
  fromAuthErrorCode,
  fromValidationError,
  usernameToEmail,
  type AuthFormState,
} from "./form-state";
import { HOME_PATH, LOGIN_PATH } from "./routes";

function readCredentials(formData: FormData) {
  return {
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const input = readCredentials(formData);
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fromValidationError(parsed.error, input.username);

  const { username, password } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
    // Read by the handle_new_user trigger to create the profile row.
    options: { data: { username } },
  });
  if (error) return fromAuthErrorCode(error.code, username);
  // No session means email confirmation is still enabled in the Supabase project.
  if (!data.session) return fromAuthErrorCode(undefined, username);

  redirect(HOME_PATH);
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const input = readCredentials(formData);
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return fromValidationError(parsed.error, input.username);

  const { username, password } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
  if (error) return fromAuthErrorCode(error.code, username);

  redirect(HOME_PATH);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(LOGIN_PATH);
}
