"use client";

import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { parseRepInput } from "@/lib/plans/rep-input";
import { strings } from "@/lib/strings";
import type { TemplateExerciseSettings } from "@/lib/validation/plans";
import { formatWeight, parseWeight, sanitizeWeightInput } from "@/lib/workout/set-input";

const { editor } = strings.plans;

export type PlanExerciseValues = {
  planned_sets: number;
  rep_range_min: number | null;
  rep_range_max: number | null;
  target_weight_kg: number | null;
  note: string | null;
};

type PlanExerciseFieldsProps = {
  // Unique per instance (labels and ids).
  idPrefix: string;
  value: PlanExerciseValues;
  // Called with valid values only; an invalid rep range shows its error and isn't reported.
  onChange: (settings: Partial<TemplateExerciseSettings>) => void;
};

// The settings of one exercise in a plan: sets, current weight, rep range and a note. Used in
// the "add exercise" sheet and in a plan row's accordion. Mount with a key per exercise, so the
// text fields start from its values.
export function PlanExerciseFields({ idPrefix, value, onChange }: PlanExerciseFieldsProps) {
  const [weight, setWeight] = useState(value.target_weight_kg == null ? "" : formatWeight(value.target_weight_kg));
  const [repMin, setRepMin] = useState(value.rep_range_min?.toString() ?? "");
  const [repMax, setRepMax] = useState(value.rep_range_max?.toString() ?? "");
  const [repError, setRepError] = useState("");
  const id = (name: string) => `${idPrefix}-${name}`;

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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <span id={id("sets")} className="text-label font-medium">
          {editor.sets}
        </span>
        <div role="group" aria-labelledby={id("sets")} className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            aria-label={editor.decreaseSets}
            disabled={value.planned_sets <= 1}
            onClick={() => onChange({ planned_sets: value.planned_sets - 1 })}
          >
            <MinusIcon aria-hidden="true" />
          </Button>
          <output aria-live="polite" className="w-10 text-center text-section font-medium tabular-nums">
            {value.planned_sets}
          </output>
          <Button
            variant="outline"
            size="icon"
            aria-label={editor.increaseSets}
            disabled={value.planned_sets >= 10}
            onClick={() => onChange({ planned_sets: value.planned_sets + 1 })}
          >
            <PlusIcon aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Weight and rep range side by side; numbers read left to right inside the range. */}
      <div className="flex items-start gap-3">
        <label className="flex w-24 shrink-0 flex-col gap-1">
          <span className="text-label font-medium">{editor.weightShort}</span>
          <Input
            inputMode="decimal"
            dir="ltr"
            value={weight}
            onChange={(event) => changeWeight(event.target.value)}
            aria-label={editor.weight}
            className="h-11 px-2 text-center tabular-nums"
          />
        </label>
        <fieldset className="flex min-w-0 flex-1 flex-col gap-1">
          <legend className="mb-1 text-label font-medium">{editor.repRange}</legend>
          <div dir="ltr" className="flex items-center gap-2">
            <Input
              aria-label={editor.repMin}
              inputMode="numeric"
              pattern="[0-9]*"
              value={repMin}
              onChange={(event) => changeReps(event.target.value, repMax)}
              aria-invalid={Boolean(repError)}
              className="h-11 px-2 text-center tabular-nums"
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
              className="h-11 px-2 text-center tabular-nums"
            />
          </div>
        </fieldset>
      </div>
      <p className={repError ? "-mt-3 text-caption text-danger" : "-mt-3 text-caption text-ink-muted"}>
        {repError || editor.fieldsHint}
      </p>

      <label className="flex flex-col gap-2">
        <span className="text-label font-medium">
          {editor.note} <span className="font-normal text-ink-muted">({strings.common.optional})</span>
        </span>
        <textarea
          defaultValue={value.note ?? ""}
          onChange={(event) => onChange({ note: event.target.value })}
          placeholder={editor.notePlaceholder}
          maxLength={300}
          rows={2}
          dir="auto"
          className="w-full rounded-md border border-hairline bg-surface px-4 py-3 text-base outline-none placeholder:text-ink-subtle focus-visible:border-rose-deep focus-visible:ring-2 focus-visible:ring-rose-deep/25 focus-visible:ring-offset-0"
        />
      </label>
    </div>
  );
}
