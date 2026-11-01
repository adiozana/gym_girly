import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { strings } from "@/lib/strings";

export const metadata: Metadata = { title: strings.auth.signup.title };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
