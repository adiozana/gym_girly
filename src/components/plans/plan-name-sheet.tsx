"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/shared/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/lib/actions/result";
import { strings } from "@/lib/strings";
import { templateNameSchema } from "@/lib/validation/plans";

type PlanNameSheetProps<T> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  initialName?: string;
  onSubmit: (name: string) => Promise<ActionResult<T>>;
  onDone: (data: T, name: string) => void;
};

// Name form used for both "new plan" and "rename".
export function PlanNameSheet<T>({
  open,
  onOpenChange,
  title,
  submitLabel,
  initialName = "",
  onSubmit,
  onDone,
}: PlanNameSheetProps<T>) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    if (next) {
      setName(initialName);
      setError("");
    }
    onOpenChange(next);
  }

  function submit() {
    const parsed = templateNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "");
      return;
    }
    startTransition(async () => {
      const result = await onSubmit(parsed.data);
      if (!result.ok) {
        if (result.fieldErrors) setError(result.error);
        else toast.error(result.error);
        return;
      }
      onOpenChange(false);
      onDone(result.data, parsed.data);
    });
  }

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      footer={
        <Button size="lg" className="w-full" onClick={submit} disabled={pending} aria-busy={pending}>
          {submitLabel}
        </Button>
      }
    >
      <form
        noValidate
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <Label htmlFor="plan-name">{strings.plans.nameLabel}</Label>
        <Input
          id="plan-name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
          placeholder={strings.plans.namePlaceholder}
          dir="auto"
          enterKeyHint="done"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "plan-name-error" : undefined}
        />
        {error && (
          <p id="plan-name-error" className="text-caption text-danger">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}
