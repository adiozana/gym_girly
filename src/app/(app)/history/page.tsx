import type { Metadata } from "next";
import { Suspense } from "react";
import { HistoryView } from "@/components/history/history-view";
import { TopBar } from "@/components/layout/top-bar";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { getGoalData } from "@/lib/dashboard/queries";
import { strings } from "@/lib/strings";

export const metadata: Metadata = { title: strings.history.title };

export default function HistoryPage() {
  return (
    <Suspense fallback={<ListSkeleton title={strings.history.title} rows={5} />}>
      <History />
    </Suspense>
  );
}

async function History() {
  const data = await getGoalData();
  return (
    <>
      <TopBar title={strings.history.title} />
      <HistoryView data={data} />
    </>
  );
}
