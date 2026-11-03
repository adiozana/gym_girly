"use client";

import {
  ArchiveBoxArrowDownIcon,
  ArrowUturnLeftIcon,
  DocumentDuplicateIcon,
  EllipsisVerticalIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PlanNameSheet } from "@/components/plans/plan-name-sheet";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { archiveTemplate, duplicateTemplate, renameTemplate, restoreTemplate } from "@/lib/plans/actions";
import { strings } from "@/lib/strings";

type PlanMenuProps = {
  plan: { id: string; name: string; is_archived: boolean };
  onRenamed?: (name: string) => void;
  onArchivedChange?: (archived: boolean) => void;
};

// Overflow menu with the plan-level actions: rename, duplicate, archive (after a confirmation) /
// restore.
export function PlanMenu({ plan, onRenamed, onArchivedChange }: PlanMenuProps) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  // Archiving leads to deletion after 30 days, so it asks first (restoring doesn't).
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [pending, startTransition] = useTransition();

  function duplicate() {
    startTransition(async () => {
      const result = await duplicateTemplate(plan.id);
      if (!result.ok) return void toast.error(result.error);
      toast.success(strings.plans.duplicated);
      router.push(`/plans/${result.data.id}`);
    });
  }

  function setArchived(archived: boolean, withUndo = true) {
    startTransition(async () => {
      const result = archived ? await archiveTemplate(plan.id) : await restoreTemplate(plan.id);
      setConfirmingArchive(false);
      if (!result.ok) return void toast.error(result.error);
      onArchivedChange?.(archived);
      const removedAssignments = result.data?.removedAssignments ?? 0;
      const message = !archived
        ? strings.plans.restored
        : removedAssignments > 0
          ? strings.plans.archivedWithGoal
          : strings.plans.archived;
      toast.success(message, {
        action: withUndo ? { label: strings.common.undo, onClick: () => setArchived(!archived, false) } : undefined,
      });
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={strings.common.more}
          render={
            <button
              type="button"
              className="flex size-11 items-center justify-center rounded-md text-ink-muted transition-colors active:bg-blush"
            />
          }
        >
          <EllipsisVerticalIcon aria-hidden="true" className="size-6" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setRenaming(true)}>
            <PencilSquareIcon aria-hidden="true" />
            {strings.plans.rename}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={duplicate}>
            <DocumentDuplicateIcon aria-hidden="true" />
            {strings.plans.duplicate}
          </DropdownMenuItem>
          {plan.is_archived ? (
            <DropdownMenuItem onClick={() => setArchived(false)}>
              <ArrowUturnLeftIcon aria-hidden="true" />
              {strings.plans.restore}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setConfirmingArchive(true)}>
              <ArchiveBoxArrowDownIcon aria-hidden="true" />
              {strings.plans.archive}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmingArchive}
        onOpenChange={setConfirmingArchive}
        title={strings.plans.archiveConfirmTitle}
        description={strings.plans.archiveConfirmBody(plan.name)}
        confirmLabel={strings.plans.archiveConfirm}
        cancelLabel={strings.common.cancel}
        onConfirm={() => setArchived(true)}
        pending={pending}
      />

      <PlanNameSheet
        open={renaming}
        onOpenChange={setRenaming}
        title={strings.plans.rename}
        submitLabel={strings.common.save}
        initialName={plan.name}
        onSubmit={(name) => renameTemplate(plan.id, name)}
        onDone={(data) => onRenamed?.(data.name)}
      />
    </>
  );
}
