export type Platform = "ios" | "android" | "other";

// Which home-screen steps fit this device. iPadOS reports a Mac user agent, so a "Mac" with a
// touch screen counts as iOS.
export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/macintosh/i.test(userAgent) && maxTouchPoints > 1) return "ios";
  return "other";
}
