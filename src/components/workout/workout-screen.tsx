"use client";

import { ClipboardDocumentListIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ExercisePicker } from "@/components/exercises/exercise-picker";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import type { ExerciseSummary } from "@/lib/exercises/types";
import { moveItem } from "@/lib/reorder";
import { strings } from "@/lib/strings";
import type { WorkoutOp } from "@/lib/validation/workout";
import { completeSession, deleteSession, getExerciseContext } from "@/lib/workout/actions";
import { emptyQueue, restoreQueue } from "@/lib/workout/queue";
import { checkDone, sanitizeRepsInput, sanitizeWeightInput } from "@/lib/workout/set-input";
import {
  canSwap,
  countDoneExercises,
  countUndoneExercises,
  defaultSetCount,
  markDone,
  renumberCards,
  suggestionFor,
  swapExercise,
  toExerciseRow,
  toSetsRow,
  withPrevious,
  withSetCount,
} from "@/lib/workout/state";
import { clearDraft, loadDraft, saveDraft } from "@/lib/workout/storage";
import type { ExerciseInfo, WorkoutCard, WorkoutData } from "@/lib/workout/types";
import { useWakeLock } from "@/lib/workout/use-wake-lock";
import { useWorkoutSync } from "@/lib/workout/use-workout-sync";
import { ExerciseCard, type CardActions, type CardError } from "./exercise-card";
import { WorkoutHeader } from "./workout-header";

const { workout: copy } = strings;

// Where a saved workout leads. Stage 4 changes this to the workout summary.
export const WORKOUT_SAVED_PATH = "/";

type PickerMode = { kind: "add" } | { kind: "swap"; cardId: string } | { kind: "extra"; cardId: string } | null;
type DialogKind = "confirmSave" | "nothingDone" | "delete" | null;

const newId = () => crypto.randomUUID();

const scrollToCard = (cardId: string, block: ScrollLogicalPosition = "start") =>
  requestAnimationFrame(() => document.getElementById(`card-${cardId}`)?.scrollIntoView({ behavior: "smooth", block }));

async function fetchContext(exerciseId: string, sessionId: string) {
  try {
    const result = await getExerciseContext(exerciseId, sessionId);
    return result.ok ? result.data : null;
  } catch {
    // Offline: the card works without history; prefill is simply empty.
    return null;
  }
}

// The active workout (SPEC.md "אימון פעיל"). Every change shows at once and is queued for
// the server (useWorkoutSync); unsaved work is mirrored to localStorage, so a reload restores
// it and sends it again.
export function WorkoutScreen({ workout, library }: { workout: WorkoutData; library: ExerciseSummary[] }) {
  const router = useRouter();
  const sessionId = workout.id;

  // Rendered on the client only, so the draft can be read before the first render.
  const [initial] = useState(() => {
    const draft = loadDraft(sessionId);
    return draft
      ? { cards: draft.cards, queue: restoreQueue(draft.ops) }
      : { cards: workout.cards, queue: emptyQueue };
  });
  const [cards, setCards] = useState<WorkoutCard[]>(initial.cards);
  // Handlers read and write the latest cards synchronously, so queued ops always match the screen.
  const cardsRef = useRef(cards);
  const [errors, setErrors] = useState<Record<string, CardError>>({});
  // One accordion open at a time keeps the screen calm mid-workout.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerMode>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [busy, setBusy] = useState(false);

  const persist = useCallback((ops: WorkoutOp[]) => saveDraft(sessionId, { ops, cards: cardsRef.current }), [sessionId]);
  const onDropped = useCallback(() => toast.error(strings.common.saveFailed), []);
  const { status, enqueue, flush, retry, stop, resume } = useWorkoutSync({
    sessionId,
    initialQueue: initial.queue,
    onDropped,
    onChange: persist,
  });
  useWakeLock();

  // -------------------------------------------------------------------------
  // State helpers
  // -------------------------------------------------------------------------

  const commit = useCallback((next: WorkoutCard[]) => {
    cardsRef.current = next;
    setCards(next);
  }, []);

  const findCard = useCallback((cardId: string) => cardsRef.current.find((card) => card.id === cardId), []);

  const replaceCard = useCallback(
    (next: WorkoutCard) => commit(cardsRef.current.map((card) => (card.id === next.id ? next : card))),
    [commit],
  );

  const setError = useCallback((cardId: string, error: CardError | null) => {
    setErrors((prev) => {
      if (error) return prev[cardId] === error ? prev : { ...prev, [cardId]: error };
      if (!(cardId in prev)) return prev;
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  }, []);

  // Writes all sets of a row (same values) in one op.
  const queueSets = useCallback(
    (card: WorkoutCard, debounce = false) => enqueue({ kind: "saveSets", sets: toSetsRow(card) }, { debounce }),
    [enqueue],
  );

  const queueCard = useCallback(
    (card: WorkoutCard, debounce = false) => enqueue({ kind: "upsertExercise", exercise: toExerciseRow(card) }, { debounce }),
    [enqueue],
  );

  // Applies a new card order: positions follow it, and every card that moved (or is new) is saved.
  const commitOrder = useCallback(
    (next: WorkoutCard[]) => {
      const before = new Map(cardsRef.current.map((card) => [card.id, card.position]));
      const ordered = renumberCards(next);
      commit(ordered);
      for (const card of ordered) if (before.get(card.id) !== card.position) queueCard(card);
    },
    [commit, queueCard],
  );

  // A card that just got an exercise (swap) learns its instructions and history.
  const loadContext = useCallback(
    async (cardId: string, exerciseId: string) => {
      const context = await fetchContext(exerciseId, sessionId);
      const current = findCard(cardId);
      if (!context || !current || current.exercise.id !== exerciseId) return;
      replaceCard(
        withPrevious({ ...current, exercise: { ...current.exercise, instructions_he: context.instructions_he } }, context.previous),
      );
    },
    [sessionId, findCard, replaceCard],
  );

  // Adds a row for an exercise: at the end, or right below another row. It gets as many sets
  // as last time (else 3), its 2 alternatives and its history for the suggestions.
  const addCard = useCallback(
    async (exercise: ExerciseSummary | ExerciseInfo, afterCardId: string | null) => {
      const context = await fetchContext(exercise.id, sessionId);
      const previous = context?.previous ?? null;
      const instructions = context?.instructions_he ?? ("instructions_he" in exercise ? exercise.instructions_he : null);
      const card: WorkoutCard = {
        id: newId(),
        position: 0,
        exercise: { ...exercise, instructions_he: instructions },
        replaced: null,
        template_exercise_id: null,
        plan: null,
        alternatives: context?.alternatives ?? [],
        note: "",
        previous,
        setIds: Array.from({ length: defaultSetCount(null, previous) }, newId),
        weight: "",
        reps: "",
        done: false,
      };

      const list = [...cardsRef.current];
      const anchor = afterCardId ? list.findIndex((c) => c.id === afterCardId) : -1;
      list.splice(anchor === -1 ? list.length : anchor + 1, 0, card);
      commitOrder(list);
      queueSets(card);
      setExpandedId(null);
      scrollToCard(card.id);
    },
    [sessionId, commitOrder, queueSets],
  );

  const swap = useCallback(
    (cardId: string, exercise: ExerciseInfo) => {
      const card = findCard(cardId);
      if (!card || !canSwap(card) || card.exercise.id === exercise.id) return;
      const next = swapExercise(card, exercise);
      replaceCard(next);
      queueCard(next);
      queueSets(next);
      setError(cardId, null);
      void loadContext(cardId, exercise.id);
    },
    [findCard, replaceCard, queueCard, queueSets, setError, loadContext],
  );

  // -------------------------------------------------------------------------
  // Row actions (stable, so rows only re-render when their own data changes)
  // -------------------------------------------------------------------------

  const actions = useMemo<CardActions>(() => {
    const changeField = (field: "weight" | "reps") => (cardId: string, text: string) => {
      const card = findCard(cardId);
      if (!card) return;
      const value = field === "weight" ? sanitizeWeightInput(text) : sanitizeRepsInput(text);
      if (value === null) return; // not a valid keystroke (e.g. a third decimal)

      let next: WorkoutCard = { ...card, [field]: value };
      setError(cardId, null);
      if (next.done) {
        // A done row must stay valid; if an edit breaks it, it's no longer marked done.
        const check = checkDone({ weight: next.weight, reps: next.reps, suggestion: null }, card.exercise.equipment);
        if (!check.ok) {
          next = { ...next, done: false };
          setError(cardId, check.error);
        }
      }
      replaceCard(next);
      queueSets(next, true);
    };

    return {
      toggleExpanded: (cardId) => setExpandedId((current) => (current === cardId ? null : cardId)),
      changeWeight: changeField("weight"),
      changeReps: changeField("reps"),

      toggleDone: (cardId) => {
        const card = findCard(cardId);
        if (!card) return;
        let next: WorkoutCard;
        if (card.done) {
          next = { ...card, done: false };
        } else {
          const check = checkDone({ weight: card.weight, reps: card.reps, suggestion: suggestionFor(card) }, card.exercise.equipment);
          if (!check.ok) return setError(cardId, check.error);
          next = markDone(card, check);
        }
        setError(cardId, null);
        replaceCard(next);
        queueSets(next);
      },

      changeSetCount: (cardId, delta) => {
        const card = findCard(cardId);
        if (!card) return;
        const next = withSetCount(card, card.setIds.length + delta, newId);
        if (next.setIds.length === card.setIds.length) return;
        replaceCard(next);
        queueSets(next);
      },

      changeNote: (cardId, text) => {
        const card = findCard(cardId);
        if (!card) return;
        const next = { ...card, note: text.slice(0, 300) };
        replaceCard(next);
        queueCard(next, true);
      },

      swap,
      addExtra: (cardId, exercise) => void addCard(exercise, cardId),
      chooseOther: (cardId) => {
        const card = findCard(cardId);
        if (card) setPicker({ kind: canSwap(card) ? "swap" : "extra", cardId });
      },

      move: (cardId, delta) => {
        const list = cardsRef.current;
        const index = list.findIndex((card) => card.id === cardId);
        if (index === -1) return;
        commitOrder(moveItem(list, index, index + delta));
        scrollToCard(cardId, "nearest");
      },

      remove: (cardId) => {
        const list = cardsRef.current;
        const index = list.findIndex((card) => card.id === cardId);
        const removed = list[index];
        if (!removed) return;
        commitOrder(list.filter((card) => card.id !== cardId));
        setExpandedId(null);
        enqueue({ kind: "deleteExercise", id: cardId });
        toast(copy.card.removed, {
          action: {
            label: strings.common.undo,
            onClick: () => {
              if (findCard(cardId)) return;
              const next = [...cardsRef.current];
              next.splice(Math.min(index, next.length), 0, removed);
              commitOrder(next);
              queueSets(removed);
            },
          },
        });
      },
    };
  }, [findCard, replaceCard, setError, queueSets, queueCard, enqueue, commitOrder, swap, addCard]);

  // -------------------------------------------------------------------------
  // Save and delete
  // -------------------------------------------------------------------------

  async function finishSave() {
    setBusy(true);
    // Everything typed must reach the server before it decides what to keep.
    const flushed = await flush();
    if (!flushed) {
      setBusy(false);
      setDialog(null);
      toast.error(copy.unsavedChanges);
      return;
    }
    let result: Awaited<ReturnType<typeof completeSession>>;
    try {
      result = await completeSession(sessionId);
    } catch {
      result = { ok: false, error: strings.common.saveFailed };
    }
    if (!result.ok) {
      setBusy(false);
      setDialog(null);
      toast.error(result.error);
      return;
    }
    if (!result.data.completed) {
      setBusy(false);
      setDialog("nothingDone");
      return;
    }
    stop();
    clearDraft(sessionId);
    toast.success(copy.saved);
    router.replace(WORKOUT_SAVED_PATH);
  }

  function requestSave() {
    if (countDoneExercises(cardsRef.current) === 0) return setDialog("nothingDone");
    if (countUndoneExercises(cardsRef.current) > 0) return setDialog("confirmSave");
    void finishSave();
  }

  async function removeWorkout() {
    setBusy(true);
    stop();
    let ok = false;
    try {
      ok = (await deleteSession(sessionId)).ok;
    } catch {
      // Handled below.
    }
    if (!ok) {
      setBusy(false);
      resume();
      toast.error(strings.errors.generic);
      return;
    }
    clearDraft(sessionId);
    toast.success(copy.deleted);
    router.replace("/");
  }


  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const title = workout.template_name ?? copy.freeWorkout;
  const pickerCard = picker && picker.kind !== "add" ? cards.find((card) => card.id === picker.cardId) : undefined;
  const undoneCount = countUndoneExercises(cards);

  function onPick(exercise: ExerciseSummary) {
    if (!picker) return;
    if (picker.kind === "add") void addCard(exercise, null);
    else if (picker.kind === "swap") swap(picker.cardId, { ...exercise, instructions_he: null });
    else void addCard(exercise, picker.cardId);
  }

  return (
    <>
      <WorkoutHeader
        title={title}
        startedAt={workout.started_at}
        status={status}
        onRetry={retry}
        onDelete={() => setDialog("delete")}
      />

      {cards.length === 0 ? (
        <EmptyState icon={ClipboardDocumentListIcon} title={copy.empty.title} body={copy.empty.body} />
      ) : (
        <div className="flex flex-col gap-3 pt-4">
          {cards.map((card, index) => (
            <ExerciseCard
              key={card.id}
              card={card}
              expanded={expandedId === card.id}
              canMoveUp={index > 0}
              canMoveDown={index < cards.length - 1}
              error={errors[card.id]}
              actions={actions}
            />
          ))}
        </div>
      )}

      {/* Sticky actions in the thumb zone; the layout's bottom padding keeps the last card clear. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/60 bg-surface/75 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-md gap-3 px-5 py-3">
          <Button variant="outline" size="lg" className="flex-1" onClick={() => setPicker({ kind: "add" })} disabled={busy}>
            <PlusIcon aria-hidden="true" />
            {copy.addExercise}
          </Button>
          <Button size="lg" className="flex-1" onClick={requestSave} disabled={busy} aria-busy={busy}>
            {copy.save}
          </Button>
        </div>
      </div>

      <ExercisePicker
        open={picker !== null}
        onOpenChange={(open) => !open && setPicker(null)}
        title={
          picker?.kind === "swap"
            ? copy.details.chooseOther
            : picker?.kind === "extra"
              ? copy.details.addAlternativeAsExtra
              : copy.addExercise
        }
        exercises={library}
        excludeIds={pickerCard ? [pickerCard.exercise.id] : cards.map((card) => card.exercise.id)}
        onSelect={onPick}
      />

      <ConfirmDialog
        open={dialog === "confirmSave"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={copy.confirmSave.title}
        description={copy.confirmSave.body(undoneCount)}
        confirmLabel={copy.confirmSave.confirm}
        cancelLabel={copy.confirmSave.cancel}
        onConfirm={() => void finishSave()}
        pending={busy}
      />
      <ConfirmDialog
        open={dialog === "nothingDone"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={copy.nothingDone.title}
        description={copy.nothingDone.body}
        confirmLabel={copy.nothingDone.delete}
        confirmVariant="danger"
        cancelLabel={copy.nothingDone.back}
        onConfirm={() => void removeWorkout()}
        pending={busy}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={copy.deleteDialog.title}
        description={
          <>
            <bdi className="font-medium text-ink">{title}</bdi> · {copy.deleteDialog.body}
          </>
        }
        confirmLabel={copy.deleteDialog.confirm}
        confirmVariant="danger"
        cancelLabel={strings.common.cancel}
        onConfirm={() => void removeWorkout()}
        pending={busy}
      />
    </>
  );
}
