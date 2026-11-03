"use client";

import { ChevronRightIcon, DevicePhoneMobileIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { InstallGuideSheet } from "@/components/install/install-guide-sheet";
import { strings } from "@/lib/strings";

// Settings row that reopens the home-screen guide at any time.
export function InstallGuideButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 w-full items-center gap-3 rounded-md border border-hairline bg-surface px-4 py-3 text-start transition-colors active:bg-blush/60"
      >
        <DevicePhoneMobileIcon aria-hidden="true" className="size-6 shrink-0 text-rose-deep" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">{strings.settings.installApp}</span>
          <span className="text-caption text-ink-muted">{strings.settings.installAppHint}</span>
        </span>
        <ChevronRightIcon aria-hidden="true" className="size-5 shrink-0 text-ink-subtle rtl:-scale-x-100" />
      </button>
      <InstallGuideSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
