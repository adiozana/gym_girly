"use client";

import { ClockIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format-date";
import { strings } from "@/lib/strings";
import { useIsClient } from "@/lib/use-is-client";
import { deleteSession } from "@/lib/workout/actions";
import { clearDraft } from "@/lib/workout/storage";
import type { ActiveSession } from "@/lib/workout/types";
import { ElapsedTime } from "./elapsed-time";

const { workout } = strings;

// Shown on home instead of "start workout" while a workout is open (SPEC.md: a new one
// doesn't start while one is open; it can be continued or deleted).
export function ActiveSessionBanner({ session }: { session: ActiveSession }) {
  const router = useRouter();
  const isClient = useIsClient();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const name = session.template_name ?? workout.freeWorkout;

  function remove() {
    startTransition(async () => {
      const result = await deleteSession(session.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      clearDraft(session.id);
      setConfirming(false);
      toast.success(workout.deleted);
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="open-workout-title" className="flex flex-col gap-4 rounded-md bg-blush p-5">
      <div className="flex flex-col gap-1">
        <p className="text-caption font-medium text-rose-deep">{workout.banner.label}</p>
        <h2 id="open-workout-title" className="text-section font-medium wrap-break-word">
          {name}
        </h2>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-ink-muted">
          {/* Local date and time: rendered on the device, in its time zone. */}
          <span className={isClient ? undefined : "invisible"}>
            {workout.banner.startedAt(isClient ? formatDateTime(session.started_at) : "00/00/0000 · 00:00")}
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon aria-hidden="true" className="size-5" />
            <span className="sr-only">{workout.banner.elapsed}</span>
            <ElapsedTime startedAt={session.started_at} />
          </span>
        </p>
      </div>
      <div className="flex gap-2">
        <Link href={`/workout/${session.id}`} className={buttonVariants({ size: "lg", className: "flex-1" })}>
          {workout.banner.continue}
        </Link>
        <Button variant="destructive" size="lg" onClick={() => setConfirming(true)}>
          {workout.banner.delete}
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={workout.deleteDialog.title}
        description={
          <>
            <bdi className="font-medium text-ink">{name}</bdi> · {workout.deleteDialog.body}
          </>
        }
        confirmLabel={workout.deleteDialog.confirm}
        confirmVariant="danger"
        cancelLabel={strings.common.cancel}
        onConfirm={remove}
        pending={pending}
      />
    </section>
  );
}
