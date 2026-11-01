import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// Restyled to the design skill: three levels (primary / secondary / tertiary) plus danger,
// 44px minimum touch target, press feedback by scale only so nothing shifts.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent text-label font-medium whitespace-nowrap transition-[transform,background-color,color,opacity] duration-150 ease-out outline-none select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default: "bg-action text-action-foreground active:bg-action/90",
        outline: "border-hairline bg-surface text-ink active:bg-blush",
        ghost: "text-ink active:bg-blush",
        link: "text-rose-deep active:opacity-70",
        destructive: "border-danger/30 bg-surface text-danger active:bg-danger/10",
        // Confirms an irreversible delete inside a dialog.
        danger: "bg-danger text-white active:bg-danger/90",
      },
      size: {
        default: "h-11 px-4",
        lg: "h-12 px-5",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
