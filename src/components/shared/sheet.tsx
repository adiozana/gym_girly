"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { strings } from "@/lib/strings";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  // Full-height sheets keep a stable size while their content changes (e.g. search results).
  tall?: boolean;
};

// Bottom sheet with a header, a scrolling body and an optional sticky footer.
export function Sheet({ open, onOpenChange, title, description, children, footer, tall }: SheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={tall ? "h-[calc(100dvh-4rem)]" : undefined}>
        <DrawerHeader className="flex-row items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <DrawerTitle className="wrap-break-word">{title}</DrawerTitle>
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label={strings.common.close}
            className="-me-2.5 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-md text-ink-muted active:bg-blush"
          >
            <XMarkIcon aria-hidden="true" className="size-6" />
          </button>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">{children}</div>
        {footer && <DrawerFooter className="border-t border-hairline">{footer}</DrawerFooter>}
      </DrawerContent>
    </Drawer>
  );
}
