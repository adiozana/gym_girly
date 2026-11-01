import { cn } from "cn";
import type { ComponentProps } from "react";

type ChipProps = ComponentProps<"button"> & { selected?: boolean };

// 32px visual chip inside a 44px touch target (design skill).
export function Chip({ selected = false, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={cn("group/chip flex h-11 shrink-0 items-center outline-none", className)}
      {...props}
    >
      <span
        className={cn(
          "flex h-8 items-center rounded-md px-3 text-label whitespace-nowrap transition-[background-color,color,transform] duration-150 group-active/chip:scale-[0.97] group-focus-visible/chip:ring-2 group-focus-visible/chip:ring-rose-deep",
          selected ? "bg-action font-medium text-action-foreground" : "bg-blush text-ink-muted",
        )}
      >
        {children}
      </span>
    </button>
  );
}

type ChoiceChipsProps<T extends string> = {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T | null;
  onChange: (value: T) => void;
  error?: string;
};

// A single-choice radio group rendered as wrapping chips.
export function ChoiceChips<T extends string>({ label, options, labels, value, onChange, error }: ChoiceChipsProps<T>) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-label font-medium text-ink">{label}</legend>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-x-2">
        {options.map((option) => (
          <Chip
            key={option}
            role="radio"
            aria-checked={value === option}
            selected={value === option}
            onClick={() => onChange(option)}
          >
            {labels[option]}
          </Chip>
        ))}
      </div>
      {error && <p className="text-caption text-danger">{error}</p>}
    </fieldset>
  );
}
