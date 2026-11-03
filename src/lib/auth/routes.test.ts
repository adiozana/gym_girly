import { describe, expect, it } from "vitest";
import { authRedirectFor } from "./routes";

describe("authRedirectFor", () => {
  it.each(["/", "/settings", "/workout/123", "/plans"])(
    "sends signed-out users from %s to login",
    (path) => {
      expect(authRedirectFor(path, false)).toBe("/login");
    },
  );

  it.each(["/login", "/signup", "/auth/callback", "/auth/reset"])("lets signed-out users open %s", (path) => {
    expect(authRedirectFor(path, false)).toBeNull();
  });

  it.each(["/login", "/signup"])("sends signed-in users from %s home", (path) => {
    expect(authRedirectFor(path, true)).toBe("/");
  });

  it.each(["/", "/settings", "/auth/callback", "/auth/reset"])("lets signed-in users open %s", (path) => {
    expect(authRedirectFor(path, true)).toBeNull();
  });
});
