"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type"> & {
  // Set when the parent tracks pending state itself (e.g. useActionState).
  pending?: boolean;
};

// Submit button that disables itself and shows a spinner while its form is sending.
export function SubmitButton({ pending, children, disabled, ...props }: SubmitButtonProps) {
  const status = useFormStatus();
  const isPending = pending ?? status.pending;

  return (
    <Button type="submit" disabled={disabled || isPending} aria-busy={isPending} {...props}>
      {isPending && <ArrowPathIcon aria-hidden="true" className="animate-spin" />}
      {children}
    </Button>
  );
}
