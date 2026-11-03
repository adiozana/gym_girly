import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { WelcomeForm } from "@/components/welcome/welcome-form";
import { getCurrentUser } from "@/lib/auth/session";
import { strings } from "@/lib/strings";

export const metadata: Metadata = { title: strings.welcome.title };

export default function WelcomePage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Welcome />
    </Suspense>
  );
}

async function Welcome() {
  const user = await getCurrentUser();
  // Already set up: straight to the app.
  if (user.name) redirect("/");
  return <WelcomeForm suggestedName={user.suggestedName} />;
}
