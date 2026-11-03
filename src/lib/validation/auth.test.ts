import { describe, expect, it } from "vitest";
import { strings } from "@/lib/strings";
import { displayNameSchema, signInSchema, signUpSchema } from "./auth";

const { errors } = strings.auth;

describe("signUpSchema", () => {
  it("trims and lower-cases the email", () => {
    expect(signUpSchema.parse({ email: "  Adi@Example.COM ", password: "12345678" })).toEqual({
      email: "adi@example.com",
      password: "12345678",
    });
  });

  it("rejects an empty or invalid email", () => {
    expect(signUpSchema.safeParse({ email: " ", password: "12345678" }).error?.issues[0]?.message).toBe(errors.emailRequired);
    expect(signUpSchema.safeParse({ email: "adi@", password: "12345678" }).error?.issues[0]?.message).toBe(errors.emailInvalid);
  });

  it("requires a password of at least 8 characters", () => {
    expect(signUpSchema.safeParse({ email: "a@b.co", password: "1234567" }).error?.issues[0]?.message).toBe(errors.passwordTooShort);
  });
});

describe("signInSchema", () => {
  it("accepts an email or an old username, and any non-empty password", () => {
    expect(signInSchema.safeParse({ email: "adi@example.com", password: "x" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "adi_01", password: "x" }).success).toBe(true);
  });

  it("rejects empty fields", () => {
    expect(signInSchema.safeParse({ email: "", password: "x" }).error?.issues[0]?.message).toBe(errors.emailRequired);
    expect(signInSchema.safeParse({ email: "a@b.co", password: "" }).error?.issues[0]?.message).toBe(errors.passwordRequired);
  });
});

describe("displayNameSchema", () => {
  it("trims and requires 1-40 characters", () => {
    expect(displayNameSchema.parse("  עדי ")).toBe("עדי");
    expect(displayNameSchema.safeParse("   ").error?.issues[0]?.message).toBe(strings.welcome.nameRequired);
    expect(displayNameSchema.safeParse("א".repeat(41)).error?.issues[0]?.message).toBe(strings.welcome.nameTooLong);
  });
});
