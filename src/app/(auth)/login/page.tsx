import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { strings } from "@/lib/strings";

export const metadata: Metadata = { title: strings.auth.login.title };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  // The form renders at once; the Google error (from /auth/callback) streams in with the URL.
  return (
    <Suspense fallback={<AuthForm mode="login" />}>
      <Form searchParams={searchParams} />
    </Suspense>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { error } = await searchParams;
  return <AuthForm mode="login" googleFailed={error === "google"} />;
}
