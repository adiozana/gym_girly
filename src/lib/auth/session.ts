import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_PATH } from "./routes";

export type CurrentUser = {
  id: string;
  username: string;
};

// Data Access Layer entry point: every page and Server Action re-checks the session
// here instead of trusting the proxy alone. Deduplicated per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect(LOGIN_PATH);

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .single();
  if (!profile) redirect(LOGIN_PATH);

  return { id: userId, username: profile.username };
});
