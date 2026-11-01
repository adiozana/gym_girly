import type { ComponentType, ReactNode, SVGProps } from "react";

type EmptyStateProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  body?: string;
  action?: ReactNode;
};

// One sentence and one action (design skill).
export function EmptyState({ icon: Icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-blush">
        <Icon aria-hidden="true" className="size-8 stroke-[1.25] text-rose-deep" />
      </div>
      <p className="text-section font-medium">{title}</p>
      {body && <p className="max-w-[32ch] text-ink-muted">{body}</p>}
      {action && <div className="mt-3 w-full">{action}</div>}
    </div>
  );
}
