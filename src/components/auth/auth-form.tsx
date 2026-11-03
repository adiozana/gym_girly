"use client";

import Link from "next/link";
import { useActionState, useState, type FocusEvent } from "react";
import { PasswordInput } from "@/components/auth/password-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signInWithGoogle, signUp } from "@/lib/auth/actions";
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

export function AuthForm({ mode, googleFailed = false }: { mode: Mode; googleFailed?: boolean }) {
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
  const emailError = errorFor("email");
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
          <Label htmlFor="email">{strings.auth.emailLabel}</Label>
          <Input
            id="email"
            name="email"
            // Login also accepts an old username, so it isn't type="email" there.
            type={isSignup ? "email" : "text"}
            inputMode="email"
            defaultValue={state.email}
            // Reset the field to the echoed value after each server response.
            key={state.email}
            dir="ltr"
            className="text-end"
            autoComplete={isSignup ? "email" : "username"}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            onBlur={validateField}
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? "email-error" : undefined}
          />
          {emailError && (
            <p id="email-error" className="text-caption text-danger">
              {emailError}
            </p>
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

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 text-caption text-ink-muted" aria-hidden="true">
          <span className="h-px flex-1 bg-hairline" />
          {strings.auth.or}
          <span className="h-px flex-1 bg-hairline" />
        </div>
        <form action={signInWithGoogle}>
          <SubmitButton variant="outline" size="lg" className="w-full">
            <GoogleLogo />
            {strings.auth.google}
          </SubmitButton>
        </form>
        {googleFailed && (
          <p role="alert" className="rounded-md bg-danger/10 px-4 py-3 text-label text-danger">
            {strings.auth.errors.google}
          </p>
        )}
      </div>

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

// Google's "G" mark, as Google's sign-in guidelines ask for on its button.
function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className="size-5">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
