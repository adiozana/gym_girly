import { describe, expect, it } from "vitest";
import { strings } from "@/lib/strings";
import { signUpSchema } from "@/lib/validation/auth";
import { fromAuthErrorCode, fromValidationError, usernameToEmail } from "./form-state";

const { errors } = strings.auth;

describe("usernameToEmail", () => {
  it("builds the internal email from the username", () => {
    expect(usernameToEmail("adi_01")).toBe("adi_01@users.gymtracker.local");
  });
});

describe("fromAuthErrorCode", () => {
  it.each(["user_already_exists", "email_exists"])("maps %s to a taken username", (code) => {
    expect(fromAuthErrorCode(code, "adi")).toEqual({
      fieldErrors: { username: errors.usernameTaken },
      username: "adi",
    });
  });

  it("maps invalid credentials to a form-level error", () => {
    expect(fromAuthErrorCode("invalid_credentials", "adi").formError).toBe(
      errors.invalidCredentials,
    );
  });

  it("maps a weak password to the password field", () => {
    expect(fromAuthErrorCode("weak_password", "adi").fieldErrors?.password).toBe(
      errors.passwordTooShort,
    );
  });

  it("falls back to a generic error for unknown codes", () => {
    expect(fromAuthErrorCode(undefined, "adi").formError).toBe(errors.generic);
    expect(fromAuthErrorCode("over_request_rate_limit", "adi").formError).toBe(errors.generic);
  });
});

describe("fromValidationError", () => {
  it("keeps the first error of each field", () => {
    const result = signUpSchema.safeParse({ username: "a", password: "short" });
    if (result.success) throw new Error("expected validation to fail");
    expect(fromValidationError(result.error, "a")).toEqual({
      fieldErrors: {
        username: errors.usernameInvalid,
        password: errors.passwordTooShort,
      },
      username: "a",
    });
  });
});
