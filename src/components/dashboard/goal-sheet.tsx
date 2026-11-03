"use client";

import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import { cn } from "cn";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Chip } from "@/components/shared/chip";
import { Sheet } from "@/components/shared/sheet";
import { Button } from "@/components/ui/button";
import { saveGoal } from "@/lib/dashboard/actions";
import type { StoredGoal } from "@/lib/dashboard/queries";
import { strings } from "@/lib/strings";

const { goal: copy } = strings.dashboard;

type PlanOption = { id: string; name: string };

type GoalSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: StoredGoal | null;
  plans: readonly PlanOption[];
  today: string;
};

type Draft = {
  type: "fixed_days" | "cycle";
  weekdays: number[];
  dayTemplates: Record<number, string>;
  on: number;
  off: number;
};

function draftFrom(goal: StoredGoal | null): Draft {
  return {
    type: goal?.type ?? "fixed_days",
    weekdays: goal?.type === "fixed_days" ? [...goal.training_weekdays] : [],
    dayTemplates: Object.fromEntries((goal?.dayTemplates ?? []).map((d) => [d.weekday, d.templateId])),
    on: goal?.type === "cycle" ? goal.cycle_on : 1,
    off: goal?.type === "cycle" ? goal.cycle_off : 1,
  };
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-label font-medium">{label}</span>
      <div role="group" aria-label={label} className="flex items-center gap-1">
        <Button variant="outline" size="icon" aria-label={copy.decrease(label)} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <MinusIcon aria-hidden="true" />
        </Button>
        <output aria-live="polite" className="w-10 text-center text-section font-medium tabular-nums">
          {value}
        </output>
        <Button variant="outline" size="icon" aria-label={copy.increase(label)} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <PlusIcon aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

// Sets or changes the goal (SPEC.md "מטרה"): fixed weekdays (optionally a plan per day) or a
// cycle of training and rest days. A change applies from today.
export function GoalSheet({ open, onOpenChange, current, plans, today }: GoalSheetProps) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(current));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...patch }));

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(draftFrom(current));
      setError("");
    }
    onOpenChange(next);
  }

  function toggleWeekday(day: number) {
    setError("");
    set({
      weekdays: draft.weekdays.includes(day)
        ? draft.weekdays.filter((d) => d !== day)
        : [...draft.weekdays, day].sort((a, b) => a - b),
    });
  }

  function submit() {
    if (draft.type === "fixed_days" && draft.weekdays.length === 0) return setError(copy.weekdayRequired);
    const input =
      draft.type === "fixed_days"
        ? {
            type: "fixed_days" as const,
            training_weekdays: draft.weekdays,
            day_templates: Object.fromEntries(
              draft.weekdays.filter((d) => draft.dayTemplates[d]).map((d) => [String(d), draft.dayTemplates[d]]),
            ),
          }
        : { type: "cycle" as const, cycle_on: draft.on, cycle_off: draft.off };
    startTransition(async () => {
      const result = await saveGoal(input, today);
      if (!result.ok) return void toast.error(result.error);
      onOpenChange(false);
      toast.success(copy.saved);
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title={copy.title}
      description={current ? copy.changeHint : undefined}
      footer={
        <Button size="lg" className="w-full" onClick={submit} disabled={pending} aria-busy={pending}>
          {strings.common.save}
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <div role="radiogroup" aria-label={copy.typeLabel} className="grid grid-cols-2 gap-1 rounded-md bg-blush p-1">
          {(["fixed_days", "cycle"] as const).map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={draft.type === type}
              onClick={() => set({ type })}
              className={cn(
                "min-h-11 rounded-md text-label font-medium transition-colors",
                draft.type === type ? "bg-surface text-ink shadow-soft" : "text-ink-muted",
              )}
            >
              {type === "fixed_days" ? copy.fixedDays : copy.cycle}
            </button>
          ))}
        </div>

        {draft.type === "fixed_days" ? (
          <>
            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-label font-medium">{copy.weekdaysLabel}</legend>
              <div className="flex flex-wrap gap-x-2">
                {copy.weekdayNames.map((name, day) => (
                  <Chip key={name} selected={draft.weekdays.includes(day)} aria-pressed={draft.weekdays.includes(day)} onClick={() => toggleWeekday(day)}>
                    {name}
                  </Chip>
                ))}
              </div>
              {error && <p className="text-caption text-danger">{error}</p>}
            </fieldset>

            {draft.weekdays.length > 0 && plans.length > 0 && (
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 text-label font-medium">{copy.dayPlanLabel}</legend>
                {draft.weekdays.map((day) => (
                  <label key={day} className="flex items-center justify-between gap-3">
                    <span className="text-label">{copy.weekdayNames[day]}</span>
                    <select
                      value={draft.dayTemplates[day] ?? ""}
                      onChange={(event) => set({ dayTemplates: { ...draft.dayTemplates, [day]: event.target.value } })}
                      className="h-11 min-w-0 max-w-[60%] flex-1 rounded-md border border-hairline bg-surface px-3 text-base outline-none focus-visible:border-rose-deep focus-visible:ring-2 focus-visible:ring-rose-deep/25 focus-visible:ring-offset-0"
                    >
                      <option value="">{copy.noPlan}</option>
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </fieldset>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <Stepper label={copy.cycleOn} value={draft.on} min={1} max={14} onChange={(on) => set({ on })} />
            <Stepper label={copy.cycleOff} value={draft.off} min={0} max={14} onChange={(off) => set({ off })} />
            <p className="text-caption text-ink-muted">{copy.cycleHint}</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}
