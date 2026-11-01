import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

// 48px high, 16px text (smaller makes iOS zoom in on focus), hairline border on white.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-md border border-hairline bg-surface px-4 text-base text-ink transition-colors outline-none placeholder:text-ink-subtle focus-visible:border-rose-deep focus-visible:ring-2 focus-visible:ring-rose-deep/25 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
