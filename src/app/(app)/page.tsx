import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCurrentUser } from "@/lib/auth/session";
import { strings } from "@/lib/strings";

// Placeholder home until the dashboard is built (stage 5).
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

      <section className="flex flex-col gap-2 pt-6">
        <Suspense fallback={<Skeleton className="h-[34px] w-40" />}>
          <Greeting />
        </Suspense>
        <p className="text-ink-muted">{strings.home.placeholder}</p>
      </section>
    </>
  );
}

async function Greeting() {
  const user = await getCurrentUser();
  return (
    <h1 className="text-title font-semibold">
      {strings.home.greeting} <bdi>{user.username}</bdi>
    </h1>
  );
}
