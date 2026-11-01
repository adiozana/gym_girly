import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { strings } from "@/lib/strings";

export const metadata: Metadata = { title: strings.auth.login.title };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
