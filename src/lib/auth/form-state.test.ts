import { describe, expect, it } from "vitest";
import { strings } from "@/lib/strings";
import { signUpSchema } from "@/lib/validation/auth";
import { fromAuthErrorCode, fromValidationError, toAuthEmail, usernameToEmail } from "./form-state";

const { errors } = strings.auth;

describe("toAuthEmail", () => {
  it("keeps emails and maps old usernames to their internal email", () => {
    expect(toAuthEmail(" Adi@Example.com ")).toBe("adi@example.com");
    expect(toAuthEmail("Adi_01")).toBe(usernameToEmail("adi_01"));
    expect(usernameToEmail("adi_01")).toBe("adi_01@users.gymtracker.local");
  });
});

describe("fromAuthErrorCode", () => {
  it.each(["user_already_exists", "email_exists"])("maps %s to a taken email", (code) => {
    expect(fromAuthErrorCode(code, "a@b.co")).toEqual({ fieldErrors: { email: errors.emailTaken }, email: "a@b.co" });
  });

  it("maps invalid credentials to a form-level error", () => {
    expect(fromAuthErrorCode("invalid_credentials", "a@b.co").formError).toBe(errors.invalidCredentials);
  });

  it("maps an invalid email and a weak password to their fields", () => {
    expect(fromAuthErrorCode("email_address_invalid", "x").fieldErrors?.email).toBe(errors.emailInvalid);
    expect(fromAuthErrorCode("weak_password", "x").fieldErrors?.password).toBe(errors.passwordTooShort);
  });

  it("falls back to a generic error", () => {
    expect(fromAuthErrorCode(undefined, "x").formError).toBe(errors.generic);
  });
});

describe("fromValidationError", () => {
  it("keeps the first error of each field", () => {
    const result = signUpSchema.safeParse({ email: "nope", password: "short" });
    if (result.success) throw new Error("expected validation to fail");
    expect(fromValidationError(result.error, "nope")).toEqual({
      fieldErrors: { email: errors.emailInvalid, password: errors.passwordTooShort },
      email: "nope",
    });
  });
});
