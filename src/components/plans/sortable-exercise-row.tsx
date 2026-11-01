"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowsUpDownIcon } from "@heroicons/react/24/outline";
import { cn } from "cn";
import { PlannedSets } from "@/components/plans/planned-sets";
import type { TemplateExerciseItem } from "@/lib/plans/types";
import { strings } from "@/lib/strings";

const { editor } = strings.plans;

export type EditorItem = TemplateExerciseItem & { pending?: boolean };

// One exercise in the plan: tap the row to open its settings, drag the handle to reorder.
export function SortableExerciseRow({ item, onOpen }: { item: EditorItem; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: item.pending,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center rounded-md border border-hairline bg-surface",
        isDragging && "relative z-10 shadow-lifted",
        item.pending && "opacity-60",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`${editor.dragHandle}: ${item.exercise.name_he}`}
        disabled={item.pending}
        // touch-none lets the handle drag without scrolling the page; the rest of the row scrolls normally.
        className="flex size-12 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-ink-subtle active:cursor-grabbing active:text-ink"
      >
        <ArrowsUpDownIcon aria-hidden="true" className="size-5" />
      </button>
      <button
        type="button"
        onClick={onOpen}
        disabled={item.pending}
        className="flex min-h-16 min-w-0 flex-1 flex-col justify-center py-3 pe-4 text-start active:bg-blush/60"
      >
        <span className="font-medium wrap-break-word">{item.exercise.name_he}</span>
        <span className="text-caption text-ink-muted">
          <PlannedSets sets={item.planned_sets} repMin={item.rep_range_min} repMax={item.rep_range_max} />
          {item.alternatives.length > 0 && <> · {editor.alternativeCount(item.alternatives.length)}</>}
        </span>
      </button>
    </li>
  );
}
