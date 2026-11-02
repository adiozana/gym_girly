import type { Metadata } from "next";
import { Suspense } from "react";
import { SessionEditor } from "@/components/history/session-editor";
import { TopBar } from "@/components/layout/top-bar";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { getSessionLog } from "@/lib/history/queries";
import { strings } from "@/lib/strings";
import { idSchema } from "@/lib/validation/common";

export const metadata: Metadata = { title: strings.session.title };

export default function SessionPage({ params }: PageProps<"/sessions/[id]">) {
  return (
    <Suspense fallback={<ListSkeleton backHref="/history" rows={4} />}>
      <Session params={params} />
    </Suspense>
  );
}

async function Session({ params }: { params: PageProps<"/sessions/[id]">["params"] }) {
  const { id } = await params;
  const log = idSchema.safeParse(id).success ? await getSessionLog(id) : null;
  if (!log) {
    return (
      <>
        <TopBar title={strings.session.title} backHref="/history" />
        <p className="py-10 text-center text-ink-muted">{strings.session.notFound}</p>
      </>
    );
  }
  // Keyed so a refreshed log (after an edit elsewhere) starts the editor fresh.
  return <SessionEditor key={log.id} log={log} />;
}
