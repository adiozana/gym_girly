"use client";

import { ArrowDownIcon, ArrowUpIcon, MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import type { EditorItem } from "@/components/plans/sortable-exercise-row";
import { Sheet } from "@/components/shared/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseRepInput } from "@/lib/plans/rep-input";
import { strings } from "@/lib/strings";
import type { TemplateExerciseSettings } from "@/lib/validation/plans";
import { formatWeight, parseWeight, sanitizeWeightInput } from "@/lib/workout/set-input";

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
}: TemplateExerciseSheetProps) {
  const [repMin, setRepMin] = useState(item.rep_range_min?.toString() ?? "");
  const [repMax, setRepMax] = useState(item.rep_range_max?.toString() ?? "");
  const [repError, setRepError] = useState("");
  const [weight, setWeight] = useState(item.target_weight_kg == null ? "" : formatWeight(item.target_weight_kg));

  function changeWeight(text: string) {
    const clean = sanitizeWeightInput(text);
    if (clean === null) return;
    setWeight(clean);
    onChange({ target_weight_kg: parseWeight(clean) });
  }

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

        <div className="flex flex-col gap-2">
          <Label htmlFor="template-exercise-weight">
            {editor.weight} <span className="font-normal text-ink-muted">({strings.common.optional})</span>
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="template-exercise-weight"
              inputMode="decimal"
              dir="ltr"
              value={weight}
              onChange={(event) => changeWeight(event.target.value)}
              aria-describedby="template-exercise-weight-hint"
              className="max-w-32 text-center tabular-nums"
            />
            <span className="text-ink-muted">{editor.weightUnit}</span>
          </div>
          <p id="template-exercise-weight-hint" className="text-caption text-ink-muted">
            {editor.weightHint}
          </p>
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

      </div>
    </Sheet>
  );
}
