// Shared setup for integration tests. They run against the local Supabase stack only.
import { execSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { usernameToEmail } from "@/lib/auth/form-state";
import type { Database } from "@/lib/supabase/database.types";

export type Client = SupabaseClient<Database>;

const status = JSON.parse(execSync("supabase status -o json", { encoding: "utf8" })) as {
  API_URL: string;
  PUBLISHABLE_KEY: string;
};

if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(status.API_URL)) {
  throw new Error(`Integration tests must run against local Supabase, got ${status.API_URL}`);
}

export const PASSWORD = "integration-test-pw";

// Unique per run, so tests can repeat without resetting the database.
export const runId = Date.now().toString(36);

export function newClient(): Client {
  return createClient<Database>(status.API_URL, status.PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signUp(username: string): Promise<{ client: Client; userId: string }> {
  const client = newClient();
  const { data, error } = await client.auth.signUp({
    email: usernameToEmail(username),
    password: PASSWORD,
    options: { data: { username } },
  });
  if (error) throw error;
  // Email confirmation is off, so sign-up signs the user in straight away.
  if (!data.session || !data.user) throw new Error("sign-up returned no session");
  return { client, userId: data.user.id };
}

// Seeded built-in exercise ids (supabase/seed.sql).
export const builtIn = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
