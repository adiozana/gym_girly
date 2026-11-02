"use client";

import { ChevronDownIcon, MinusIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { cn } from "cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { TopBar } from "@/components/layout/top-bar";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { deleteSavedSession, removeLoggedExercise, saveLoggedExercise } from "@/lib/history/actions";
import type { SessionExerciseLog, SessionLog } from "@/lib/history/queries";
import { formatDate } from "@/lib/format-date";
import { strings } from "@/lib/strings";
import { checkDone, formatReps, formatWeight, parseReps, parseWeight, sanitizeRepsInput, sanitizeWeightInput } from "@/lib/workout/set-input";
import { MAX_SET_COUNT } from "@/lib/workout/state";

const { session: copy, workout } = strings;
const SAVE_DELAY_MS = 600;


// One exercise of a saved workout, as the editor holds it (its sets are uniform).
type Row = {
  id: string;
  name: string;
  equipment: SessionExerciseLog["exercise"]["equipment"];
  replaced: string | null;
  setIds: string[];
  weight: string;
  reps: string;
};

function toRow(exercise: SessionExerciseLog): Row {
  const first = exercise.sets[0];
  return {
    id: exercise.id,
    name: exercise.exercise.name_he,
    equipment: exercise.exercise.equipment,
    replaced: exercise.replaced?.name_he ?? null,
    setIds: exercise.sets.map((set) => set.id),
    weight: formatWeight(first?.weight_kg ?? null),
    reps: formatReps(first?.reps ?? null),
  };
}

// A past workout (SPEC.md "פרטי אימון"): every exercise with its weight, reps and sets, edited in
// an accordion and saved as it changes. Editing changes every calculation that reads it.
export function SessionEditor({ log }: { log: SessionLog }) {
  const router = useRouter();
  const [rows, setRows] = useState(() => log.exercises.filter((e) => e.sets.length > 0).map(toRow));
  const [openId, setOpenId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // Pending edits are sent when the page is left.
  useEffect(() => {
    const pendingTimers = timers.current;
    return () => {
      for (const [id, timer] of pendingTimers) {
        clearTimeout(timer);
        void save(id);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(id: string) {
    timers.current.delete(id);
    const row = rowsRef.current.find((r) => r.id === id);
    if (!row) return;
    const result = await saveLoggedExercise(log.id, {
      sessionExerciseId: row.id,
      setIds: row.setIds,
      weight_kg: parseWeight(row.weight),
      reps: parseReps(row.reps),
      is_done: true,
    });
    if (!result.ok) toast.error(result.error, { action: { label: strings.common.retry, onClick: () => void save(id) } });
  }

  // Applies a change locally, and saves it after a short pause if the row is still valid.
  function update(id: string, change: (row: Row) => Row) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const next = change(row);
    setRows((prev) => prev.map((r) => (r.id === id ? next : r)));

    const check = checkDone({ weight: next.weight, reps: next.reps, suggestion: null }, next.equipment);
    clearTimeout(timers.current.get(id));
    if (!check.ok) {
      timers.current.delete(id);
      setErrors((prev) => ({ ...prev, [id]: check.error === "reps" ? workout.errors.repsRequired : workout.errors.weightRequired }));
      return;
    }
    setErrors((prev) => ({ ...prev, [id]: "" }));
    timers.current.set(id, setTimeout(() => void save(id), SAVE_DELAY_MS));
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await removeLoggedExercise(log.id, id);
      if (!result.ok) return void toast.error(result.error);
      clearTimeout(timers.current.get(id));
      timers.current.delete(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setOpenId(null);
      toast.success(copy.removed);
    });
  }

  function deleteWorkout() {
    startTransition(async () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
      const result = await deleteSavedSession(log.id);
      if (!result.ok) return void toast.error(result.error);
      setConfirmingDelete(false);
      toast.success(copy.deleted);
      router.replace("/history");
    });
  }

  const title = log.template_name ?? workout.freeWorkout;

  return (
    <div className="flex flex-1 flex-col">
      <TopBar title={title} backHref="/history" />
      <p className="-mt-2 text-ink-muted">
        <bdi>{formatDate(log.session_date)}</bdi>
      </p>
      <Link href={`/workout/${log.id}/summary`} className={cn(buttonVariants({ variant: "link" }), "self-start px-0")}>
        {copy.summary}
      </Link>

      <ul className="mt-2 flex flex-col gap-3">
        {rows.map((row) => {
          const expanded = openId === row.id;
          const panelId = `log-panel-${row.id}`;
          const weightText = row.weight === "" ? null : row.weight;
          return (
            <li key={row.id} className="rounded-md border border-hairline bg-surface">
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : row.id)}
                aria-expanded={expanded}
                aria-controls={panelId}
                className="flex min-h-14 w-full items-center gap-2 py-2 ps-4 pe-2 text-start"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-label font-medium wrap-break-word">{row.name}</span>
                  <span className="text-caption text-ink-muted">
                    {row.replaced && <>{workout.card.replacedFor(row.replaced)} · </>}
                    <bdi>{copy.setsLine(row.setIds.length, workout.details.setValue(weightText, parseReps(row.reps) ?? 0))}</bdi>
                  </span>
                </span>
                <ChevronDownIcon
                  aria-hidden="true"
                  className={cn("size-5 shrink-0 text-ink-muted transition-transform duration-200", expanded && "rotate-180")}
                />
              </button>

              <div
                id={panelId}
                className={cn("grid transition-[grid-template-rows] duration-200 ease-out", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
                inert={!expanded}
              >
                <div className="min-h-0 overflow-hidden">
                  <div className="flex flex-col gap-4 border-t border-hairline px-4 pt-4 pb-3">
                    <div className="flex items-end gap-3">
                      <label className="flex w-24 flex-col gap-1">
                        <span className="text-label font-medium">{strings.plans.editor.weightShort}</span>
                        <input
                          inputMode="decimal"
                          dir="ltr"
                          value={row.weight}
                          onChange={(e) => {
                            const value = sanitizeWeightInput(e.target.value);
                            if (value !== null) update(row.id, (r) => ({ ...r, weight: value }));
                          }}
                          aria-label={workout.card.weightLabel(row.name)}
                          className="h-11 rounded-md border border-hairline bg-surface px-2 text-center text-base tabular-nums outline-none focus-visible:border-rose-deep focus-visible:ring-2 focus-visible:ring-rose-deep/25 focus-visible:ring-offset-0"
                        />
                      </label>
                      <label className="flex w-20 flex-col gap-1">
                        <span className="text-label font-medium">{workout.card.columns.reps}</span>
                        <input
                          inputMode="numeric"
                          dir="ltr"
                          value={row.reps}
                          onChange={(e) => {
                            const value = sanitizeRepsInput(e.target.value);
                            if (value !== null) update(row.id, (r) => ({ ...r, reps: value }));
                          }}
                          aria-label={workout.card.repsLabel(row.name)}
                          className="h-11 rounded-md border border-hairline bg-surface px-2 text-center text-base tabular-nums outline-none focus-visible:border-rose-deep focus-visible:ring-2 focus-visible:ring-rose-deep/25 focus-visible:ring-offset-0"
                        />
                      </label>
                      <div role="group" aria-label={workout.card.sets} className="ms-auto flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={workout.card.decreaseSets}
                          disabled={row.setIds.length <= 1}
                          onClick={() => update(row.id, (r) => ({ ...r, setIds: r.setIds.slice(0, -1) }))}
                        >
                          <MinusIcon aria-hidden="true" />
                        </Button>
                        <output aria-live="polite" className="w-8 text-center font-medium tabular-nums">
                          {row.setIds.length}
                        </output>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={workout.card.increaseSets}
                          disabled={row.setIds.length >= MAX_SET_COUNT}
                          onClick={() => update(row.id, (r) => ({ ...r, setIds: [...r.setIds, crypto.randomUUID()] }))}
                        >
                          <PlusIcon aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                    {errors[row.id] && (
                      <p role="alert" className="text-caption text-danger">
                        {errors[row.id]}
                      </p>
                    )}
                    <div className="border-t border-hairline pt-2">
                      <Button
                        variant="ghost"
                        className="text-danger"
                        onClick={() => remove(row.id)}
                        disabled={pending || rows.length <= 1}
                      >
                        <TrashIcon aria-hidden="true" />
                        {copy.removeExercise}
                      </Button>
                      {rows.length <= 1 && <p className="text-caption text-ink-muted">{copy.lastExerciseHint}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pt-10">
        <Button variant="destructive" size="lg" className="w-full" onClick={() => setConfirmingDelete(true)}>
          {copy.deleteWorkout}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={copy.deleteTitle}
        description={
          <>
            <bdi className="font-medium text-ink">{title}</bdi> · {copy.deleteBody}
          </>
        }
        confirmLabel={copy.deleteWorkout}
        confirmVariant="danger"
        cancelLabel={strings.common.cancel}
        onConfirm={deleteWorkout}
        pending={pending}
      />
    </div>
  );
}
