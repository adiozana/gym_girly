"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MinusIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import type { EditorItem } from "@/components/plans/sortable-exercise-row";
import { Sheet } from "@/components/shared/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseRepInput } from "@/lib/plans/rep-input";
import { strings } from "@/lib/strings";
import type { TemplateExerciseSettings } from "@/lib/validation/plans";

const { editor } = strings.plans;

export type SaveState = "idle" | "saving" | "saved";

type TemplateExerciseSheetProps = {
  item: EditorItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saveState: SaveState;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChange: (settings: Partial<TemplateExerciseSettings>) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  onAddAlternative: () => void;
  onRemoveAlternative: (alternativeId: string) => void;
  onMoveAlternative: (alternativeId: string, delta: -1 | 1) => void;
};

// Settings of one exercise in the plan. Changes apply immediately; the editor saves them.
// Mount with key={item.id} so the text fields start from the item's values.
export function TemplateExerciseSheet({
  item,
  open,
  onOpenChange,
  saveState,
  canMoveUp,
  canMoveDown,
  onChange,
  onMove,
  onRemove,
  onAddAlternative,
  onRemoveAlternative,
  onMoveAlternative,
}: TemplateExerciseSheetProps) {
  const [repMin, setRepMin] = useState(item.rep_range_min?.toString() ?? "");
  const [repMax, setRepMax] = useState(item.rep_range_max?.toString() ?? "");
  const [repError, setRepError] = useState("");

  function changeReps(minText: string, maxText: string) {
    setRepMin(minText);
    setRepMax(maxText);
    const min = parseRepInput(minText);
    const max = parseRepInput(maxText);
    if (min === "invalid" || max === "invalid") return setRepError(editor.repValueInvalid);
    if (min != null && max != null && min > max) return setRepError(editor.repRangeInvalid);
    setRepError("");
    onChange({ rep_range_min: min, rep_range_max: max });
  }

  const saveLabel = saveState === "saving" ? editor.saving : saveState === "saved" ? editor.saved : undefined;

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={item.exercise.name_he}
      description={saveLabel && <span aria-live="polite">{saveLabel}</span>}
      footer={
        <>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => onMove(-1)} disabled={!canMoveUp}>
              <ArrowUpIcon aria-hidden="true" />
              {editor.moveUp}
            </Button>
            <Button variant="outline" onClick={() => onMove(1)} disabled={!canMoveDown}>
              <ArrowDownIcon aria-hidden="true" />
              {editor.moveDown}
            </Button>
          </div>
          <Button variant="destructive" onClick={onRemove}>
            {editor.removeExercise}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-7">
        {/* Planned sets: stepper, 1–10 */}
        <div className="flex items-center justify-between gap-4">
          <span id="sets-label" className="text-label font-medium">
            {editor.sets}
          </span>
          <div role="group" aria-labelledby="sets-label" className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              aria-label={editor.decreaseSets}
              disabled={item.planned_sets <= 1}
              onClick={() => onChange({ planned_sets: item.planned_sets - 1 })}
            >
              <MinusIcon aria-hidden="true" />
            </Button>
            <output aria-live="polite" className="w-10 text-center text-section font-medium tabular-nums">
              {item.planned_sets}
            </output>
            <Button
              variant="outline"
              size="icon"
              aria-label={editor.increaseSets}
              disabled={item.planned_sets >= 10}
              onClick={() => onChange({ planned_sets: item.planned_sets + 1 })}
            >
              <PlusIcon aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Rep range: optional; one value means an exact count */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-label font-medium">{editor.repRange}</legend>
          <div dir="ltr" className="flex items-center gap-3">
            <Input
              aria-label={editor.repMin}
              inputMode="numeric"
              pattern="[0-9]*"
              value={repMin}
              onChange={(event) => changeReps(event.target.value, repMax)}
              aria-invalid={Boolean(repError)}
              className="text-center tabular-nums"
            />
            <span aria-hidden="true" className="text-ink-muted">
              –
            </span>
            <Input
              aria-label={editor.repMax}
              inputMode="numeric"
              pattern="[0-9]*"
              value={repMax}
              onChange={(event) => changeReps(repMin, event.target.value)}
              aria-invalid={Boolean(repError)}
              className="text-center tabular-nums"
            />
          </div>
          <p className={repError ? "text-caption text-danger" : "text-caption text-ink-muted"}>
            {repError || editor.repRangeHint}
          </p>
        </fieldset>

        <div className="flex flex-col gap-2">
          <Label htmlFor="template-exercise-note">
            {editor.note} <span className="font-normal text-ink-muted">({strings.common.optional})</span>
          </Label>
          <textarea
            id="template-exercise-note"
            defaultValue={item.note ?? ""}
            onChange={(event) => onChange({ note: event.target.value })}
            placeholder={editor.notePlaceholder}
            maxLength={300}
            rows={2}
            dir="auto"
            className="w-full rounded-md border border-hairline bg-surface px-4 py-3 text-base outline-none placeholder:text-ink-subtle focus-visible:border-rose-deep focus-visible:ring-2 focus-visible:ring-rose-deep/25 focus-visible:ring-offset-0"
          />
        </div>

        <section className="flex flex-col gap-2">
          <div className="flex flex-col">
            <h3 className="text-label font-medium">{editor.alternatives}</h3>
            <p className="text-caption text-ink-muted">{editor.alternativesHint}</p>
          </div>
          {item.alternatives.length === 0 ? (
            <p className="py-2 text-ink-muted">{editor.noAlternatives}</p>
          ) : (
            <ol className="divide-y divide-hairline rounded-md border border-hairline">
              {item.alternatives.map((alternative, index) => {
                const pending = alternative.id.startsWith("temp-");
                const name = alternative.exercise.name_he;
                return (
                  <li key={alternative.id} className="flex items-center gap-1 ps-3">
                    <span className="w-5 shrink-0 text-caption text-ink-muted tabular-nums">{index + 1}</span>
                    <span className="min-w-0 flex-1 py-3 wrap-break-word">{name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={editor.moveAlternativeUp(name)}
                      disabled={pending || index === 0}
                      onClick={() => onMoveAlternative(alternative.id, -1)}
                    >
                      <ChevronUpIcon aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={editor.moveAlternativeDown(name)}
                      disabled={pending || index === item.alternatives.length - 1}
                      onClick={() => onMoveAlternative(alternative.id, 1)}
                    >
                      <ChevronDownIcon aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={editor.removeAlternativeNamed(name)}
                      disabled={pending}
                      onClick={() => onRemoveAlternative(alternative.id)}
                    >
                      <XMarkIcon aria-hidden="true" />
                    </Button>
                  </li>
                );
              })}
            </ol>
          )}
          <Button variant="link" className="self-start px-0" onClick={onAddAlternative}>
            <PlusIcon aria-hidden="true" />
            {editor.addAlternative}
          </Button>
        </section>
      </div>
    </Sheet>
  );
}
