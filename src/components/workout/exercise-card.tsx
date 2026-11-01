"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  EllipsisVerticalIcon,
  InformationCircleIcon,
  MinusIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { memo, useCallback, useRef, useState } from "react";
import { PlannedSets } from "@/components/plans/planned-sets";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { strings } from "@/lib/strings";
import { canSwap } from "@/lib/workout/state";
import type { WorkoutCard } from "@/lib/workout/types";
import { SetRow, type SetError } from "./set-row";

const { card: copy } = strings.workout;

// Stable handlers from the screen; every one names the card it acts on.
export type CardActions = {
  openDetails: (cardId: string) => void;
  changeWeight: (cardId: string, setId: string, text: string) => void;
  changeReps: (cardId: string, setId: string, text: string) => void;
  toggleDone: (cardId: string, setId: string) => void;
  addSet: (cardId: string) => void;
  removeLastSet: (cardId: string) => void;
  changeNote: (cardId: string, text: string) => void;
  move: (cardId: string, delta: -1 | 1) => void;
  remove: (cardId: string) => void;
};

type ExerciseCardProps = {
  card: WorkoutCard;
  canMoveUp: boolean;
  canMoveDown: boolean;
  errors: Readonly<Record<string, SetError>>;
  actions: CardActions;
};

export const ExerciseCard = memo(function ExerciseCard({ card, canMoveUp, canMoveDown, errors, actions }: ExerciseCardProps) {
  const [noteOpen, setNoteOpen] = useState(card.note !== "");
  const noteRef = useRef<HTMLTextAreaElement>(null);
  // Set while "note" was chosen in the menu, so closing the menu focuses the note field
  // instead of returning focus to the menu button.
  const wantsNoteFocus = useRef(false);
  const name = card.exercise.name_he;
  const noteId = `note-${card.id}`;
  const showPlan = card.plan && (card.plan.rep_range_min != null || card.plan.rep_range_max != null);
  const swappable = card.alternatives.length > 0 && canSwap(card);

  const onWeightChange = useCallback((setId: string, text: string) => actions.changeWeight(card.id, setId, text), [actions, card.id]);
  const onRepsChange = useCallback((setId: string, text: string) => actions.changeReps(card.id, setId, text), [actions, card.id]);
  const onToggleDone = useCallback((setId: string) => actions.toggleDone(card.id, setId), [actions, card.id]);

  return (
    <article
      id={`card-${card.id}`}
      aria-label={name}
      className="flex scroll-mt-24 flex-col gap-3 rounded-md border border-hairline bg-surface p-4"
    >
      <header className="flex items-start gap-1">
        <button
          type="button"
          onClick={() => actions.openDetails(card.id)}
          aria-label={copy.openDetails(name)}
          className="-ms-2 -mt-1 flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center rounded-md px-2 py-1 text-start transition-colors active:bg-blush"
        >
          <span className="flex items-start gap-1.5">
            <span className="text-section font-medium wrap-break-word">{name}</span>
            <InformationCircleIcon aria-hidden="true" className="mt-1 size-5 shrink-0 text-rose-deep" />
          </span>
          {card.replaced && <span className="text-caption text-ink-muted">{copy.replacedFor(card.replaced.name_he)}</span>}
          {swappable && (
            <span className="text-caption text-rose-deep">
              {strings.plans.editor.alternativeCount(card.alternatives.length)}
            </span>
          )}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={copy.menu(name)}
            render={
              <button
                type="button"
                className="-me-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors active:bg-blush"
              />
            }
          >
            <EllipsisVerticalIcon aria-hidden="true" className="size-6" />
          </DropdownMenuTrigger>
          <DropdownMenuContent finalFocus={() => (wantsNoteFocus.current ? (noteRef.current ?? false) : true)}>
            <DropdownMenuItem
              onClick={() => {
                wantsNoteFocus.current = true;
                setNoteOpen(true);
                setTimeout(() => {
                  noteRef.current?.focus();
                  wantsNoteFocus.current = false;
                }, 0);
              }}
            >
              <PencilSquareIcon aria-hidden="true" />
              {copy.note}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canMoveUp} onClick={() => actions.move(card.id, -1)}>
              <ArrowUpIcon aria-hidden="true" />
              {copy.moveUp}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canMoveDown} onClick={() => actions.move(card.id, 1)}>
              <ArrowDownIcon aria-hidden="true" />
              {copy.moveDown}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => actions.remove(card.id)}>
              <TrashIcon aria-hidden="true" />
              {copy.remove}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {(showPlan || card.previous?.note) && (
        <div className="flex flex-col gap-0.5 text-label text-ink-muted">
          {showPlan && card.plan && (
            <p>
              <PlannedSets sets={card.plan.planned_sets} repMin={card.plan.rep_range_min} repMax={card.plan.rep_range_max} />
            </p>
          )}
          {card.previous?.note && (
            <p className="wrap-break-word">
              <span className="font-medium">{copy.previousNote}</span> <bdi>{card.previous.note}</bdi>
            </p>
          )}
        </div>
      )}

      {card.sets.length > 0 && (
        <div className="flex flex-col gap-2">
          <div
            aria-hidden="true"
            className="grid grid-cols-[2rem_1fr_1fr_3rem] gap-2 text-center text-caption text-ink-muted"
          >
            <span>{copy.columns.set}</span>
            <span>{copy.columns.weight}</span>
            <span>{copy.columns.reps}</span>
            <span>{copy.columns.done}</span>
          </div>
          <ul className="flex flex-col gap-2">
            {card.sets.map((set) => (
              <SetRow
                key={set.id}
                set={set}
                error={errors[set.id]}
                onWeightChange={onWeightChange}
                onRepsChange={onRepsChange}
                onToggleDone={onToggleDone}
              />
            ))}
          </ul>
        </div>
      )}

      {noteOpen && (
        <div className="flex flex-col gap-1">
          <label htmlFor={noteId} className="text-label font-medium">
            {copy.note}
          </label>
          <textarea
            id={noteId}
            aria-label={copy.noteLabel(name)}
            value={card.note}
            onChange={(event) => actions.changeNote(card.id, event.target.value)}
            onBlur={() => {
              if (card.note.trim() === "" && !wantsNoteFocus.current) setNoteOpen(false);
            }}
            ref={noteRef}
            placeholder={copy.notePlaceholder}
            maxLength={300}
            rows={2}
            dir="auto"
            className="w-full rounded-md border border-hairline bg-surface px-4 py-3 text-base outline-none placeholder:text-ink-subtle focus-visible:border-rose-deep focus-visible:ring-2 focus-visible:ring-rose-deep/25 focus-visible:ring-offset-0"
          />
        </div>
      )}

      <footer className="-mx-2 flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => actions.addSet(card.id)} className="text-rose-deep">
          <PlusIcon aria-hidden="true" />
          {copy.addSet}
        </Button>
        <Button
          variant="ghost"
          onClick={() => actions.removeLastSet(card.id)}
          disabled={card.sets.length <= 1}
          className="text-ink-muted"
        >
          <MinusIcon aria-hidden="true" />
          {copy.removeSet}
        </Button>
      </footer>
    </article>
  );
});
