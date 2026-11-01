"use client"

import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline"
import { Toaster as Sonner, type ToasterProps } from "sonner"

// Light theme only; toasts sit at the bottom, above the tab bar (design skill).
const Toaster = (props: ToasterProps) => (
  <Sonner
    theme="light"
    position="bottom-center"
    dir="rtl"
    offset={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
    mobileOffset={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
    duration={5000}
    className="toaster group"
    icons={{
      success: <CheckCircleIcon className="size-5 text-success" />,
      info: <InformationCircleIcon className="size-5 text-info" />,
      warning: <ExclamationTriangleIcon className="size-5 text-warning" />,
      error: <ExclamationCircleIcon className="size-5 text-danger" />,
    }}
    style={
      {
        "--normal-bg": "var(--color-surface)",
        "--normal-text": "var(--color-ink)",
        "--normal-border": "var(--color-hairline)",
        "--border-radius": "var(--radius)",
        zIndex: 50,
      } as React.CSSProperties
    }
    toastOptions={{
      classNames: {
        toast: "font-sans text-base shadow-lifted",
        actionButton: "!bg-transparent !text-rose-deep !font-medium !text-label !min-h-11 !px-3",
      },
    }}
    {...props}
  />
)

export { Toaster }
