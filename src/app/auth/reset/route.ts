import { NextResponse, type NextRequest } from "next/server";
import { HOME_PATH, LOGIN_PATH } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

// getCurrentUser() sends a signed-in token without a profile here (the account was deleted).
// The token still verifies, so only signing out breaks the / ↔ /login loop. Users whose
// profile exists are sent home untouched, so this can't be used to sign anyone out.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (userId) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (profile) return NextResponse.redirect(new URL(HOME_PATH, request.url));
    // Local scope: just drop the cookies; the account behind them is already gone.
    await supabase.auth.signOut({ scope: "local" });
  }
  return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
}
