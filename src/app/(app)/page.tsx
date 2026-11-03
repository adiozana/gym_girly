import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Suspense } from "react";
import { InstallGuideOnce } from "@/components/install/install-guide-once";
import { Skeleton } from "@/components/ui/skeleton";
import { Dashboard } from "@/components/dashboard/dashboard";
import { ActiveSessionBanner } from "@/components/workout/active-session-banner";
import { StartWorkout } from "@/components/workout/start-workout";
import { getCurrentUser } from "@/lib/auth/session";
import { listTemplates } from "@/lib/plans/queries";
import { strings } from "@/lib/strings";
import { getActiveSession } from "@/lib/workout/queries";
import { getGoalData } from "@/lib/dashboard/queries";
import { getProgressData } from "@/lib/progress/queries";

// Home (SPEC.md "דשבורד").
export default function HomePage() {
  return (
    <>
      <header className="flex h-16 items-center justify-between">
        <p className="text-label font-medium text-rose-deep">{strings.app.name}</p>
        <Link
          href="/settings"
          aria-label={strings.settings.open}
          className="-me-2.5 flex size-11 items-center justify-center rounded-md text-ink transition-colors active:bg-blush"
        >
          <Cog6ToothIcon aria-hidden="true" className="size-6" />
        </Link>
      </header>

      <section className="pt-4">
        <Suspense fallback={<Skeleton className="h-[34px] w-40" />}>
          <Greeting />
        </Suspense>
      </section>

      {/* SPEC.md order: start / continue, today and the streak, the challenge, progress. */}
      <Suspense fallback={<Skeleton className="mt-6 h-96 w-full" />}>
        <Home />
      </Suspense>

      <InstallGuideOnce />
    </>
  );
}

async function Home() {
  const [active, templates, goalData, progress] = await Promise.all([
    getActiveSession(),
    listTemplates(),
    getGoalData(),
    getProgressData(),
  ]);
  const plans = templates.active.map((plan) => ({ id: plan.id, name: plan.name }));
  return (
    <div className="flex flex-col gap-8 pt-6">
      {active ? (
        <ActiveSessionBanner session={active} />
      ) : (
        <StartWorkout plans={templates.active} goals={goalData.goals} />
      )}
      <Dashboard data={goalData} plans={plans} progress={progress} />
    </div>
  );
}

async function Greeting() {
  const user = await getCurrentUser();
  return (
    <h1 className="text-title font-semibold">
      {user.name ? (
        <>
          {strings.home.greeting} <bdi>{user.name}</bdi>
        </>
      ) : (
        strings.home.greetingNoName
      )}
    </h1>
  );
}
