import { NextResponse, type NextRequest } from "next/server";
import { HOME_PATH, LOGIN_PATH } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

// getCurrentUser() sends a signed-in token without a profile here. Two ways to get there:
// - only the profile row was deleted: the account still exists, so recreate the empty profile
//   (RLS lets a user insert their own row) and continue to the welcome screen;
// - the whole account was deleted: the token still verifies locally, so only signing out
//   breaks the / ↔ /login loop.
// getUser() asks the auth server, so it tells the two apart.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (!error && data.user) {
    const { error: insertError } = await supabase
      .from("profiles")
      .upsert({ id: data.user.id }, { onConflict: "id", ignoreDuplicates: true });
    if (!insertError) return NextResponse.redirect(new URL(HOME_PATH, request.url));
  }
  // Local scope: just drop the cookies; the account behind them is gone (or unusable).
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
}
