"use client";

import { ArrowRightIcon, ClockIcon, TrashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { strings } from "@/lib/strings";
import { deleteSession } from "@/lib/workout/actions";
import { clearDraft } from "@/lib/workout/storage";
import type { ActiveSession } from "@/lib/workout/types";
import { ElapsedTime } from "./elapsed-time";

const { workout } = strings;

// Shown on home instead of "start workout" while a workout is open (SPEC.md: a new one
// doesn't start while one is open; it can be continued or deleted).
export function ActiveSessionBanner({ session }: { session: ActiveSession }) {
  const router = useRouter();
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
    // A quiet row: tap it (or the arrow) to go back to the workout; the trash icon deletes it.
    <section aria-labelledby="open-workout-title" className="flex items-center gap-1 rounded-md border border-hairline bg-surface py-2 ps-4 pe-2">
      <Link href={`/workout/${session.id}`} className="flex min-h-12 min-w-0 flex-1 flex-col justify-center">
        <span className="text-caption font-medium text-rose-deep">{workout.banner.label}</span>
        <span id="open-workout-title" className="font-medium wrap-break-word">
          {name}
        </span>
        <span className="flex items-center gap-1 text-caption text-ink-muted">
          <ClockIcon aria-hidden="true" className="size-4" />
          <span className="sr-only">{workout.banner.elapsed}</span>
          <ElapsedTime startedAt={session.started_at} />
        </span>
      </Link>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={workout.banner.delete}
        className="flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors active:bg-blush active:text-danger"
      >
        <TrashIcon aria-hidden="true" className="size-5" />
      </button>
      <Link
        href={`/workout/${session.id}`}
        aria-label={workout.banner.continue}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blush text-rose-deep transition-transform active:scale-95"
      >
        {/* "Forward" points to the end side, which is left in RTL. */}
        <ArrowRightIcon aria-hidden="true" className="size-5 rtl:-scale-x-100" />
      </Link>

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
