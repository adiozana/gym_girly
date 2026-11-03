import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { WELCOME_PATH } from "@/lib/auth/routes";

// Anyone without a name yet (a new account) is sent to the welcome screen. Rendered inside a
// Suspense boundary in the app layout, so it never holds back the page itself.
export async function RequireName() {
  const user = await getCurrentUser();
  if (!user.name) redirect(WELCOME_PATH);
  return null;
}
