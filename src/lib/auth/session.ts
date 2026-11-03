import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { LOGIN_PATH } from "./routes";

export type CurrentUser = {
  id: string;
  email: string | null;
  // Set on the welcome screen; null until then.
  name: string | null;
  // A name offered on the welcome screen (Google's full name), if any.
  suggestedName: string | null;
};

// Data Access Layer entry point: every page and Server Action re-checks the session
// here instead of trusting the proxy alone. Deduplicated per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect(LOGIN_PATH);

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", claims.sub).single();
  if (!profile) redirect(LOGIN_PATH);

  const metadata = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const suggested = typeof metadata.full_name === "string" ? metadata.full_name : typeof metadata.name === "string" ? metadata.name : null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" && !claims.email.endsWith("@users.gymtracker.local") ? claims.email : null,
    name: profile.display_name,
    suggestedName: suggested?.trim().slice(0, 40) || null,
  };
});
