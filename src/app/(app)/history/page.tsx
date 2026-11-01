import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import type { Metadata } from "next";
import { TopBar } from "@/components/layout/top-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { strings } from "@/lib/strings";

export const metadata: Metadata = { title: strings.history.title };

// Placeholder until the monthly calendar is built (stage 5).
export default function HistoryPage() {
  return (
    <>
      <TopBar title={strings.history.title} />
      <EmptyState icon={CalendarDaysIcon} title={strings.history.emptyTitle} body={strings.history.emptyBody} />
    </>
  );
}
