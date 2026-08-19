import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  eyebrow?: string;
  className?: string;
};

function EmptyState({
  title,
  description,
  action,
  icon,
  eyebrow = "Nothing here yet",
  className,
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed border-input bg-paper px-6 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-5 grid size-12 place-items-center rounded-md border border-border bg-secondary text-evergreen">
          {icon}
        </div>
      ) : null}
      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {eyebrow}
      </p>
      <h3 className="mt-2 max-w-md font-display text-2xl font-semibold text-evergreen-deep">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
