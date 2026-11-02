"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDownIcon, ArrowsUpDownIcon, ArrowUpIcon, ChevronDownIcon, TrashIcon } from "@heroicons/react/24/outline";
import { cn } from "cn";
import { PlanExerciseFields } from "@/components/plans/plan-exercise-fields";
import { PlannedSets } from "@/components/plans/planned-sets";
import { Button } from "@/components/ui/button";
import type { TemplateExerciseItem } from "@/lib/plans/types";
import { strings } from "@/lib/strings";
import type { TemplateExerciseSettings } from "@/lib/validation/plans";
import { formatWeight } from "@/lib/workout/set-input";

const { editor } = strings.plans;

export type EditorItem = TemplateExerciseItem & { pending?: boolean };

type SortableExerciseRowProps = {
  item: EditorItem;
  expanded: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  saveLabel: string | undefined;
  onToggle: () => void;
  onChange: (settings: Partial<TemplateExerciseSettings>) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
};

// One exercise in the plan, like a workout row: drag handle, name and plan, and a chevron at
// the far end that opens its settings in an accordion (edited in place, saved as they change).
export function SortableExerciseRow({
  item,
  expanded,
  canMoveUp,
  canMoveDown,
  saveLabel,
  onToggle,
  onChange,
  onMove,
  onRemove,
}: SortableExerciseRowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: item.pending,
  });
  const name = item.exercise.name_he;
  const panelId = `plan-panel-${item.id}`;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-md border border-hairline bg-surface",
        isDragging && "relative z-10 shadow-lifted",
        item.pending && "opacity-60",
      )}
    >
      <div className="flex items-center gap-1 py-1 ps-1 pe-1">
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`${editor.dragHandle}: ${name}`}
          disabled={item.pending}
          // touch-none lets the handle drag without scrolling the page; the rest of the row scrolls normally.
          className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-ink-subtle active:cursor-grabbing active:text-ink"
        >
          <ArrowsUpDownIcon aria-hidden="true" className="size-5" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          disabled={item.pending}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="flex min-h-12 min-w-0 flex-1 flex-col justify-center py-1 text-start"
        >
          <span className="text-label font-medium wrap-break-word">{name}</span>
          <span className="text-caption text-ink-muted">
            <PlannedSets sets={item.planned_sets} repMin={item.rep_range_min} repMax={item.rep_range_max} />
            {item.target_weight_kg != null && (
              <>
                {" · "}
                <bdi>{editor.weightValue(formatWeight(item.target_weight_kg))}</bdi>
              </>
            )}
          </span>
        </button>
        <button
          type="button"
          onClick={onToggle}
          disabled={item.pending}
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={editor.settingsOf(name)}
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted"
        >
          <ChevronDownIcon aria-hidden="true" className={cn("size-5 transition-transform duration-200", expanded && "rotate-180")} />
        </button>
      </div>

      <div
        id={panelId}
        role="region"
        aria-label={editor.settingsOf(name)}
        className={cn("grid transition-[grid-template-rows] duration-200 ease-out", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
        inert={!expanded}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-4 border-t border-hairline px-4 pt-4 pb-3">
            {expanded && <PlanExerciseFields key={item.id} idPrefix={item.id} value={item} onChange={onChange} />}
            <div className="flex flex-wrap items-center gap-x-2 border-t border-hairline pt-2">
              <Button variant="ghost" onClick={() => onMove(-1)} disabled={!canMoveUp}>
                <ArrowUpIcon aria-hidden="true" />
                {editor.moveUp}
              </Button>
              <Button variant="ghost" onClick={() => onMove(1)} disabled={!canMoveDown}>
                <ArrowDownIcon aria-hidden="true" />
                {editor.moveDown}
              </Button>
              <Button variant="ghost" className="text-danger" onClick={onRemove}>
                <TrashIcon aria-hidden="true" />
                {editor.removeExercise}
              </Button>
              {saveLabel && (
                <span aria-live="polite" className="ms-auto text-caption text-ink-muted">
                  {saveLabel}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
