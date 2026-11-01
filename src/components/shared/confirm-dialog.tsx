"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOnHidden } from "@/lib/use-on-hidden";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  // "danger" for irreversible deletes (design system), "default" for a primary confirmation.
  confirmVariant?: "default" | "danger";
  cancelLabel: string;
  onConfirm: () => void;
  pending?: boolean;
};

// A short confirmation: one confirm button and a way back.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  confirmVariant = "default",
  cancelLabel,
  onConfirm,
  pending = false,
}: ConfirmDialogProps) {
  // Only an open one: another instance unmounting must not close whatever shares its state.
  useOnHidden(() => open && onOpenChange(false));
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant={confirmVariant} size="lg" onClick={onConfirm} disabled={pending} aria-busy={pending}>
            {pending && <ArrowPathIcon aria-hidden="true" className="animate-spin" />}
            {confirmLabel}
          </Button>
          <DialogClose render={<Button variant="outline" size="lg" disabled={pending} />}>{cancelLabel}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
