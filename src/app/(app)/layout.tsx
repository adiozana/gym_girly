import { Suspense } from "react";
import { BottomNav, NavBar } from "@/components/layout/bottom-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {/* Bottom padding keeps the last item clear of the fixed tab bar. */}
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-[env(safe-area-inset-top)] pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      {/* usePathname() needs a boundary on routes with dynamic params (Cache Components). */}
      <Suspense fallback={<NavBar pathname={null} />}>
        <BottomNav />
      </Suspense>
    </>
  );
}
