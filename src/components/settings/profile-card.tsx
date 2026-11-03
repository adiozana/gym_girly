"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveDisplayName } from "@/lib/auth/actions";
import { strings } from "@/lib/strings";
import { displayNameSchema } from "@/lib/validation/auth";

const { settings: copy } = strings;

// Settings: the user's name (editable in place) and the email they sign in with.
export function ProfileCard({ name, email }: { name: string; email: string | null }) {
  const [current, setCurrent] = useState(name);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    const parsed = displayNameSchema.safeParse(draft);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "");
    startTransition(async () => {
      const result = await saveDisplayName(parsed.data);
      if (!result.ok) return void toast.error(result.error);
      setCurrent(result.data.name);
      setEditing(false);
      toast.success(copy.nameSaved);
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-md border border-hairline bg-surface p-4">
      <div className="flex flex-col gap-1">
        <p className="text-caption text-ink-muted">{copy.nameLabel}</p>
        {editing ? (
          <form
            noValidate
            className="flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
          >
            <div className="flex items-center gap-2">
              <Input
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setError("");
                }}
                aria-label={copy.nameLabel}
                maxLength={40}
                dir="auto"
                autoFocus
                aria-invalid={Boolean(error)}
              />
              <Button type="submit" disabled={pending} aria-busy={pending}>
                {strings.common.save}
              </Button>
            </div>
            {error && <p className="text-caption text-danger">{error}</p>}
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium wrap-break-word">{current}</p>
            <Button
              variant="link"
              className="shrink-0 px-0"
              onClick={() => {
                setDraft(current);
                setEditing(true);
              }}
            >
              {copy.editName}
            </Button>
          </div>
        )}
      </div>
      {email && (
        <div className="flex flex-col gap-1">
          <p className="text-caption text-ink-muted">{strings.auth.emailLabel}</p>
          <p dir="ltr" className="text-end wrap-break-word">
            {email}
          </p>
        </div>
      )}
    </section>
  );
}
