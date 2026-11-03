import { NextResponse, type NextRequest } from "next/server";
import { HOME_PATH, LOGIN_PATH } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

// Google returns here with a one-time code; exchanging it signs the user in. New users then
// meet the welcome screen (the app layout sends anyone without a name there).
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(HOME_PATH, request.url));
  }
  return NextResponse.redirect(new URL(`${LOGIN_PATH}?error=google`, request.url));
}
