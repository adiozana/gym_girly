"use client";

import { CheckCircleIcon, FlagIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { GoalSheet } from "@/components/dashboard/goal-sheet";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveDisplayName } from "@/lib/auth/actions";
import { strings } from "@/lib/strings";
import { useToday } from "@/lib/use-today";
import { displayNameSchema } from "@/lib/validation/auth";

const { welcome: copy } = strings;

// After the first sign-in (SPEC.md): a name (required) and a goal (optional).
export function WelcomeForm({ suggestedName }: { suggestedName: string | null }) {
  const router = useRouter();
  const today = useToday();
  const [name, setName] = useState(suggestedName ?? "");
  const [error, setError] = useState("");
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalSet, setGoalSet] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    const parsed = displayNameSchema.safeParse(name);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "");
    startTransition(async () => {
      const result = await saveDisplayName(parsed.data);
      if (!result.ok) return void toast.error(result.error);
      router.replace("/");
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-label font-medium text-rose-deep">{strings.app.name}</p>
        <h1 className="text-title font-semibold">{copy.title}</h1>
        <p className="text-ink-muted">{copy.subtitle}</p>
      </header>

      <form
        noValidate
        className="flex flex-col gap-8"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="display-name">{copy.nameLabel}</Label>
          <Input
            id="display-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder={copy.namePlaceholder}
            autoComplete="given-name"
            maxLength={40}
            dir="auto"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "display-name-error" : undefined}
          />
          {error && (
            <p id="display-name-error" className="text-caption text-danger">
              {error}
            </p>
          )}
        </div>

        <section aria-labelledby="welcome-goal" className="flex flex-col gap-2">
          <h2 id="welcome-goal" className="text-label font-medium">
            {copy.goalLabel}
          </h2>
          <p className="text-caption text-ink-muted">{copy.goalHint}</p>
          {goalSet ? (
            <div className="flex items-center justify-between gap-3 rounded-md bg-success/10 px-4 py-3">
              <span className="flex items-center gap-2 text-label font-medium text-success">
                <CheckCircleIcon aria-hidden="true" className="size-5" />
                {copy.goalSet}
              </span>
              <Button variant="link" className="px-0" type="button" onClick={() => setEditingGoal(true)}>
                {copy.editGoal}
              </Button>
            </div>
          ) : (
            <Button variant="outline" type="button" className="self-start" onClick={() => setEditingGoal(true)} disabled={!today}>
              <FlagIcon aria-hidden="true" />
              {copy.setGoal}
            </Button>
          )}
        </section>

        <SubmitButton size="lg" className="w-full" pending={pending}>
          {copy.submit}
        </SubmitButton>
      </form>

      {today && (
        <GoalSheet
          open={editingGoal}
          onOpenChange={setEditingGoal}
          onSaved={() => setGoalSet(true)}
          current={null}
          plans={[]}
          today={today}
        />
      )}
    </div>
  );
}
