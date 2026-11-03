import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { strings } from "@/lib/strings";

export const metadata: Metadata = { title: strings.auth.signup.title };

export default function SignupPage({ searchParams }: PageProps<"/signup">) {
  // The form renders at once; the Google error (from /auth/callback) streams in with the URL.
  return (
    <Suspense fallback={<AuthForm mode="signup" />}>
      <Form searchParams={searchParams} />
    </Suspense>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/signup">["searchParams"] }) {
  const { error } = await searchParams;
  return <AuthForm mode="signup" googleFailed={error === "google"} />;
}
