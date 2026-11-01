import { describe, expect, it } from "vitest";
import { strings } from "@/lib/strings";
import { signInSchema, signUpSchema, usernameSchema } from "./auth";

const { errors } = strings.auth;

describe("usernameSchema", () => {
  it("lower-cases and trims the input", () => {
    expect(usernameSchema.parse("  Adi_Ozana1 ")).toBe("adi_ozana1");
  });

  it.each(["ab", "a".repeat(21), "adi ozana", "adi-ozana", "עדי", "adi.o", ""])(
    "rejects %j",
    (value) => {
      const result = usernameSchema.safeParse(value);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(errors.usernameInvalid);
    },
  );

  it.each(["abc", "a".repeat(20), "user_01", "123"])("accepts %j", (value) => {
    expect(usernameSchema.safeParse(value).success).toBe(true);
  });
});

describe("signUpSchema", () => {
  it("requires a password of at least 8 characters", () => {
    const result = signUpSchema.safeParse({ username: "adi", password: "1234567" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(errors.passwordTooShort);
  });

  it("accepts valid credentials and normalizes the username", () => {
    expect(signUpSchema.parse({ username: "ADI", password: "12345678" })).toEqual({
      username: "adi",
      password: "12345678",
    });
  });
});

describe("signInSchema", () => {
  it("accepts any non-empty password", () => {
    expect(signInSchema.safeParse({ username: "adi", password: "x" }).success).toBe(true);
  });

  it("rejects an empty password", () => {
    const result = signInSchema.safeParse({ username: "adi", password: "" });
    expect(result.error?.issues[0]?.message).toBe(errors.passwordRequired);
  });
});
