"use client";

import { ArrowPathIcon, PaperAirplaneIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { cn } from "cn";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { PlannedSets } from "@/components/plans/planned-sets";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Sheet } from "@/components/shared/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { draftPlanTurn, saveDraftAsPlan } from "@/lib/ai/actions";
import type { PlanDraft } from "@/lib/ai/plan-draft";
import type { ExerciseSummary } from "@/lib/exercises/types";
import { strings } from "@/lib/strings";
import { formatWeight } from "@/lib/workout/set-input";

const { planAssistant: copy } = strings;

type Turn = { role: "user" | "model"; text: string };

const emptyDraft = (): PlanDraft => ({ name: copy.defaultName, exercises: [] });

// "Quick plan": describe the workout in free text; the assistant (Gemini, on the server) turns
// it into a plan draft, asks what else to add, and "סיום" saves it as a new plan.
export function PlanAssistant({ exercises }: { exercises: ExerciseSummary[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft);
  const [text, setText] = useState("");
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [thinking, startThinking] = useTransition();
  const [saving, startSaving] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const names = useMemo(() => new Map(exercises.map((e) => [e.id, e.name_he])), [exercises]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, thinking]);

  function reset() {
    setTurns([]);
    setDraft(emptyDraft());
    setText("");
  }

  function requestClose() {
    if (draft.exercises.length > 0 && !saving) setConfirmingClose(true);
    else {
      setOpen(false);
      reset();
    }
  }

  function send() {
    const message = text.trim();
    if (!message || thinking) return;
    const next = [...turns, { role: "user" as const, text: message }];
    setTurns(next);
    setText("");
    startThinking(async () => {
      const result = await draftPlanTurn(next, draft);
      if (!result.ok) {
        // Give the message back so nothing typed is lost.
        setTurns(turns);
        setText(message);
        toast.error(result.error);
        return;
      }
      setDraft(result.data.draft);
      setTurns([...next, { role: "model", text: result.data.message }]);
    });
  }

  function finish() {
    startSaving(async () => {
      const result = await saveDraftAsPlan(draft);
      if (!result.ok) return void toast.error(result.error);
      toast.success(copy.saved);
      setOpen(false);
      reset();
      router.push(`/plans/${result.data.id}`);
    });
  }

  return (
    <>
      <Button variant="outline" size="lg" className="w-full" onClick={() => setOpen(true)}>
        <SparklesIcon aria-hidden="true" />
        {copy.open}
      </Button>

      <Sheet
        open={open}
        onOpenChange={(next) => (next ? setOpen(true) : requestClose())}
        title={copy.title}
        tall
        footer={
          <>
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
            >
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                aria-label={copy.inputLabel}
                placeholder={copy.inputPlaceholder}
                rows={2}
                maxLength={1500}
                dir="auto"
                className="min-h-12 flex-1 resize-none rounded-md border border-hairline bg-surface px-4 py-3 text-base outline-none placeholder:text-ink-subtle focus-visible:border-rose-deep focus-visible:ring-2 focus-visible:ring-rose-deep/25 focus-visible:ring-offset-0"
              />
              <Button type="submit" variant="outline" size="icon" aria-label={copy.send} disabled={!text.trim() || thinking}>
                {/* "Send" points to the end side, which is left in RTL. */}
                <PaperAirplaneIcon aria-hidden="true" className="rtl:-scale-x-100" />
              </Button>
            </form>
            <Button size="lg" className="w-full" onClick={finish} disabled={draft.exercises.length === 0 || thinking || saving} aria-busy={saving}>
              {saving && <ArrowPathIcon aria-hidden="true" className="animate-spin" />}
              {copy.finish}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="rounded-md bg-blush px-4 py-3 text-label text-ink">{copy.intro}</p>

          <ol className="flex flex-col gap-2" aria-live="polite">
            {turns.map((turn, index) => (
              <li
                key={index}
                className={cn(
                  "max-w-[85%] rounded-md px-4 py-2 text-label wrap-break-word whitespace-pre-wrap",
                  turn.role === "user" ? "self-start bg-action text-action-foreground" : "self-end bg-blush text-ink",
                )}
              >
                {turn.text}
              </li>
            ))}
            {thinking && (
              <li className="flex items-center gap-2 self-end rounded-md bg-blush px-4 py-2 text-label text-ink-muted">
                <ArrowPathIcon aria-hidden="true" className="size-4 animate-spin" />
                {copy.thinking}
              </li>
            )}
          </ol>

          {(draft.exercises.length > 0 || turns.length > 0) && (
            <section aria-labelledby="assistant-draft" className="flex flex-col gap-3 rounded-md border border-hairline bg-surface p-4">
              <h3 id="assistant-draft" className="text-caption text-ink-muted">
                {copy.draftTitle}
              </h3>
              <label className="flex flex-col gap-1">
                <span className="sr-only">{copy.planName}</span>
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value.slice(0, 60) })}
                  dir="auto"
                  className="h-11 font-medium"
                />
              </label>
              {draft.exercises.length === 0 ? (
                <p className="text-label text-ink-muted">{copy.empty}</p>
              ) : (
                <ol className="flex flex-col divide-y divide-hairline">
                  {draft.exercises.map((exercise) => (
                    <li key={exercise.exercise_id} className="flex flex-col py-2">
                      <span className="text-label font-medium">{names.get(exercise.exercise_id)}</span>
                      <span className="text-caption text-ink-muted">
                        <PlannedSets sets={exercise.planned_sets} repMin={exercise.rep_range_min} repMax={exercise.rep_range_max} />
                        {exercise.target_weight_kg != null && (
                          <>
                            {" · "}
                            <bdi>{strings.plans.editor.weightValue(formatWeight(exercise.target_weight_kg))}</bdi>
                          </>
                        )}
                        {exercise.note && <> · {exercise.note}</>}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              <p className="text-caption text-ink-muted">{copy.finishHint}</p>
            </section>
          )}
          <div ref={endRef} />
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmingClose}
        onOpenChange={setConfirmingClose}
        title={copy.closeTitle}
        description={copy.closeBody}
        confirmLabel={copy.closeConfirm}
        confirmVariant="danger"
        cancelLabel={copy.keepEditing}
        onConfirm={() => {
          setConfirmingClose(false);
          setOpen(false);
          reset();
        }}
      />
    </>
  );
}
