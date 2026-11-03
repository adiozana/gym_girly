"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { fail, invalid, ok, type ActionResult } from "@/lib/actions/result";
import { createClient } from "@/lib/supabase/server";
import { displayNameSchema, signInSchema, signUpSchema } from "@/lib/validation/auth";
import { fromAuthErrorCode, fromValidationError, toAuthEmail, type AuthFormState } from "./form-state";
import { getCurrentUser } from "./session";
import { AUTH_CALLBACK_PATH, HOME_PATH, LOGIN_PATH, WELCOME_PATH } from "./routes";

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
}

// Email + password; no confirmation email, so the account is ready at once and the welcome
// screen asks for a name.
export async function signUp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const input = readCredentials(formData);
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return fromValidationError(parsed.error, input.email);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error) return fromAuthErrorCode(error.code, parsed.data.email);
  // No session means email confirmation is still enabled in the Supabase project.
  if (!data.session) return fromAuthErrorCode(undefined, parsed.data.email);

  redirect(WELCOME_PATH);
}

export async function signIn(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const input = readCredentials(formData);
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return fromValidationError(parsed.error, input.email);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: toAuthEmail(parsed.data.email),
    password: parsed.data.password,
  });
  if (error) return fromAuthErrorCode(error.code, input.email);

  redirect(HOME_PATH);
}

// Google sign-in goes through Supabase (the client id and secret live in the Supabase
// dashboard, not in this app); Google then returns to /auth/callback.
export async function signInWithGoogle(): Promise<void> {
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}${AUTH_CALLBACK_PATH}` },
  });
  if (error || !data.url) redirect(`${LOGIN_PATH}?error=google`);
  redirect(data.url);
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(LOGIN_PATH);
}

// The name from the welcome screen (and settings). RLS limits the update to the user's own row.
export async function saveDisplayName(name: unknown): Promise<ActionResult<{ name: string }>> {
  const user = await getCurrentUser();
  const parsed = displayNameSchema.safeParse(name);
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ display_name: parsed.data }).eq("id", user.id);
  if (error) return fail();

  revalidatePath("/", "layout");
  return ok({ name: parsed.data });
}
