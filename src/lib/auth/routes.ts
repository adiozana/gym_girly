export const LOGIN_PATH = "/login";
export const HOME_PATH = "/";

const AUTH_PATHS = new Set(["/login", "/signup"]);

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.has(pathname);
}

// Where the proxy should send a request, or null to let it through.
// Signed-out users may only see the auth screens; signed-in users skip them.
export function authRedirectFor(pathname: string, isSignedIn: boolean): string | null {
  if (isAuthPath(pathname)) return isSignedIn ? HOME_PATH : null;
  return isSignedIn ? null : LOGIN_PATH;
}
