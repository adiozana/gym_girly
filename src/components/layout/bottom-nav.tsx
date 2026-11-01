"use client";

import {
  BookOpenIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";
import {
  BookOpenIcon as BookOpenSolid,
  CalendarDaysIcon as CalendarDaysSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListSolid,
  HomeIcon as HomeSolid,
} from "@heroicons/react/24/solid";
import { cn } from "cn";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { strings } from "@/lib/strings";

const tabs = [
  { href: "/", label: strings.nav.home, icon: HomeIcon, activeIcon: HomeSolid },
  { href: "/plans", label: strings.nav.plans, icon: ClipboardDocumentListIcon, activeIcon: ClipboardDocumentListSolid },
  { href: "/history", label: strings.nav.history, icon: CalendarDaysIcon, activeIcon: CalendarDaysSolid },
  { href: "/exercises", label: strings.nav.exercises, icon: BookOpenIcon, activeIcon: BookOpenSolid },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  // SPEC.md: the tab bar is hidden during an active workout.
  if (pathname.startsWith("/workout")) return null;
  return <NavBar pathname={pathname} />;
}

// Rendered without a pathname as the Suspense fallback: same bar, no tab highlighted yet.
export function NavBar({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label={strings.nav.label}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-white/60 bg-surface/75 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
    >
      <ul className="mx-auto flex max-w-md">
        {tabs.map(({ href, label, icon: Icon, activeIcon: ActiveIcon }) => {
          const active = pathname !== null && isActive(pathname, href);
          const TabIcon = active ? ActiveIcon : Icon;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-caption transition-colors active:opacity-70",
                  active ? "font-medium text-rose-deep" : "text-ink-muted",
                )}
              >
                <TabIcon aria-hidden="true" className="size-6" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
