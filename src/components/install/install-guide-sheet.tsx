"use client";

import {
  ArrowDownTrayIcon,
  ArrowUpOnSquareIcon,
  CheckIcon,
  EllipsisVerticalIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { cn } from "cn";
import { useState, type ComponentType, type SVGProps } from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/shared/sheet";
import { Button } from "@/components/ui/button";
import { promptInstall, useCanInstall, usePlatform } from "@/lib/install/use-install";
import { strings } from "@/lib/strings";

const copy = strings.install;

type Tab = "ios" | "android";
type Icon = ComponentType<SVGProps<SVGSVGElement>>;

// Each step's icon looks like the button the user taps at that step.
const STEPS: Record<Tab, { icons: readonly Icon[]; steps: readonly { title: string; detail: string }[] }> = {
  ios: { icons: [ArrowUpOnSquareIcon, PlusIcon, CheckIcon], steps: copy.iosSteps },
  android: { icons: [EllipsisVerticalIcon, ArrowDownTrayIcon, CheckIcon], steps: copy.androidSteps },
};

// How to add the app to the home screen: three steps for iPhone or Android (the device's own
// tab first), plus a one-tap install where the browser allows it (Android Chrome).
export function InstallGuideSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const platform = usePlatform();
  const canInstall = useCanInstall();
  const [chosen, setChosen] = useState<Tab | null>(null);
  const tab: Tab = chosen ?? (platform === "android" ? "android" : "ios");
  const direct = tab === "android" && canInstall;

  async function install() {
    const accepted = await promptInstall();
    if (accepted) {
      toast.success(copy.installed);
      onOpenChange(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={copy.title}
      description={copy.description}
      footer={
        direct ? (
          <Button size="lg" className="w-full" onClick={install}>
            <ArrowDownTrayIcon aria-hidden="true" />
            {copy.installNow}
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={() => onOpenChange(false)}>
            {copy.done}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-6">
        <div role="radiogroup" aria-label={copy.platformLabel} className="grid grid-cols-2 gap-1 rounded-md bg-blush p-1">
          {(["ios", "android"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={tab === option}
              onClick={() => setChosen(option)}
              className={cn(
                "min-h-11 rounded-md text-label font-medium transition-colors",
                tab === option ? "bg-surface text-ink shadow-soft" : "text-ink-muted",
              )}
            >
              {copy[option]}
            </button>
          ))}
        </div>

        {direct && (
          <div className="flex flex-col gap-1">
            <p className="text-label">{copy.installNowHint}</p>
            <h3 className="mt-3 text-label font-medium text-ink-muted">{copy.manualTitle}</h3>
          </div>
        )}

        <ol className="flex flex-col gap-5">
          {STEPS[tab].steps.map((step, index) => {
            const StepIcon = STEPS[tab].icons[index];
            return (
              <li key={step.title} className="flex gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-md border border-hairline bg-surface text-rose-deep shadow-soft">
                  {StepIcon && <StepIcon aria-hidden="true" className="size-6" />}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-caption text-ink-muted">{copy.stepLabel(index + 1)}</span>
                  <span className="font-medium">{step.title}</span>
                  <span className="text-label text-ink-muted">{step.detail}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </Sheet>
  );
}
