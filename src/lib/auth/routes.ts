export const LOGIN_PATH = "/login";
export const HOME_PATH = "/";
export const WELCOME_PATH = "/welcome";
export const AUTH_CALLBACK_PATH = "/auth/callback";
// Repairs a session whose profile or account was deleted (e.g. in the dashboard).
export const SESSION_RESET_PATH = "/auth/reset";

const AUTH_PATHS = new Set(["/login", "/signup"]);

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.has(pathname);
}

// Where the proxy should send a request, or null to let it through.
// Signed-out users may only see the auth screens; signed-in users skip them. The OAuth
// callback and the session reset are open to both (they sign the user in or out).
export function authRedirectFor(pathname: string, isSignedIn: boolean): string | null {
  if (pathname === AUTH_CALLBACK_PATH || pathname === SESSION_RESET_PATH) return null;
  if (isAuthPath(pathname)) return isSignedIn ? HOME_PATH : null;
  return isSignedIn ? null : LOGIN_PATH;
}
