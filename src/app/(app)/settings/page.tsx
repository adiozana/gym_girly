import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsGoals } from "@/components/dashboard/settings-goals";
import { signOut } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { getGoalData } from "@/lib/dashboard/queries";
import { listTemplates } from "@/lib/plans/queries";
import { strings } from "@/lib/strings";

export const metadata: Metadata = { title: strings.settings.title };

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-16 items-center gap-2">
        <Link
          href="/"
          aria-label={strings.settings.back}
          className="-ms-2.5 flex size-11 items-center justify-center rounded-md text-ink transition-colors active:bg-blush"
        >
          {/* "Back" points to the start side, which is right in RTL. */}
          <ChevronLeftIcon aria-hidden="true" className="size-6 rtl:-scale-x-100" />
        </Link>
        <h1 className="text-section font-medium">{strings.settings.title}</h1>
      </header>

      <section className="mt-4 flex flex-col gap-1 rounded-md border border-hairline bg-surface p-4">
        <p className="text-caption text-ink-muted">{strings.auth.usernameLabel}</p>
        <Suspense fallback={<Skeleton className="h-6 w-24" />}>
          <Username />
        </Suspense>
      </section>

      <div className="mt-6">
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <Goals />
        </Suspense>
      </div>

      {/* Dangerous actions sit apart from the rest, at the bottom (design skill). */}
      <form action={signOut} className="mt-auto pt-10">
        <SubmitButton variant="destructive" size="lg" className="w-full">
          {strings.settings.signOut}
        </SubmitButton>
      </form>
    </div>
  );
}

async function Username() {
  const user = await getCurrentUser();
  return (
    <p dir="ltr" className="text-end font-medium">
      {user.username}
    </p>
  );
}

async function Goals() {
  const [data, templates] = await Promise.all([getGoalData(), listTemplates()]);
  return <SettingsGoals data={data} plans={templates.active.map((plan) => ({ id: plan.id, name: plan.name }))} />;
}
