"use client";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { strings } from "@/lib/strings";

type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type">;

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeSlashIcon : EyeIcon;

  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        dir="ltr"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        // The input is LTR inside an RTL row: its "start" is the side the toggle sits on.
        className="ps-12 text-end"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? strings.auth.hidePassword : strings.auth.showPassword}
        aria-pressed={visible}
        className="absolute inset-y-0 end-0 flex w-12 items-center justify-center rounded-md text-ink-muted transition-colors active:text-ink"
      >
        <Icon aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
