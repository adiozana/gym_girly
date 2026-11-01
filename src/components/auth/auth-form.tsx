"use client";

import Link from "next/link";
import { useActionState, useState, type FocusEvent } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/auth/actions";
import type { AuthField, AuthFormState } from "@/lib/auth/form-state";
import { strings } from "@/lib/strings";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";

type Mode = "login" | "signup";
type BlurErrors = Partial<Record<AuthField, string | undefined>>;

const config = {
  login: {
    action: signIn,
    schema: signInSchema,
    copy: strings.auth.login,
    switchHref: "/signup",
    passwordAutoComplete: "current-password",
  },
  signup: {
    action: signUp,
    schema: signUpSchema,
    copy: strings.auth.signup,
    switchHref: "/login",
    passwordAutoComplete: "new-password",
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const { action, schema, copy, switchHref, passwordAutoComplete } = config[mode];
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, {});
  // Blur results belong to the server response they followed; a new response discards them.
  const [blur, setBlur] = useState<{ after: AuthFormState; errors: BlurErrors }>({
    after: state,
    errors: {},
  });
  const blurErrors = blur.after === state ? blur.errors : {};

  // Validate on blur (not on every keystroke), with the same schema the server uses.
  function validateField(event: FocusEvent<HTMLInputElement>) {
    const field = event.target.name as AuthField;
    if (event.target.value === "") return;
    const result = schema.shape[field].safeParse(event.target.value);
    setBlur({
      after: state,
      errors: { ...blurErrors, [field]: result.error?.issues[0]?.message },
    });
  }

  // A field checked on blur shows that result (even "valid"); otherwise the server's.
  const errorFor = (field: AuthField) =>
    field in blurErrors ? blurErrors[field] : state.fieldErrors?.[field];
  const usernameError = errorFor("username");
  const passwordError = errorFor("password");
  const isSignup = mode === "signup";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-label font-medium text-rose-deep">{strings.app.name}</p>
        <h1 className="text-title font-semibold">{copy.title}</h1>
        <p className="text-ink-muted">{copy.subtitle}</p>
      </header>

      <form action={formAction} noValidate className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Label htmlFor="username">{strings.auth.usernameLabel}</Label>
          <Input
            id="username"
            name="username"
            defaultValue={state.username}
            // Reset the field to the echoed value after each server response.
            key={state.username}
            dir="ltr"
            className="text-end"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            onBlur={validateField}
            aria-invalid={Boolean(usernameError)}
            aria-describedby={usernameError ? "username-error" : isSignup ? "username-hint" : undefined}
          />
          {usernameError ? (
            <p id="username-error" className="text-caption text-danger">
              {usernameError}
            </p>
          ) : (
            isSignup && (
              <p id="username-hint" className="text-caption text-ink-muted">
                {strings.auth.usernameHint}
              </p>
            )
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{strings.auth.passwordLabel}</Label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete={passwordAutoComplete}
            required
            onBlur={validateField}
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? "password-error" : isSignup ? "password-hint" : undefined}
          />
          {passwordError ? (
            <p id="password-error" className="text-caption text-danger">
              {passwordError}
            </p>
          ) : (
            isSignup && (
              <p id="password-hint" className="text-caption text-ink-muted">
                {strings.auth.passwordHint}
              </p>
            )
          )}
        </div>

        {state.formError && (
          <p role="alert" className="rounded-md bg-danger/10 px-4 py-3 text-label text-danger">
            {state.formError}
          </p>
        )}

        <SubmitButton size="lg" className="w-full" pending={pending}>
          {copy.submit}
        </SubmitButton>
      </form>

      <p className="flex items-center justify-center gap-1 text-ink-muted">
        {copy.switchPrompt}
        <Link
          href={switchHref}
          className="inline-flex min-h-11 items-center px-1 font-medium text-rose-deep active:opacity-70"
        >
          {copy.switchLink}
        </Link>
      </p>
    </div>
  );
}
