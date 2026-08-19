import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

export function MetricCard({
  label,
  value,
  note,
  icon,
  className,
}: {
  label: string;
  value: string | number;
  note: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("min-h-36 bg-card p-5 sm:p-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </p>
        {icon ? (
          <span aria-hidden="true" className="text-cobalt [&_svg]:size-4">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-4xl font-semibold leading-none text-evergreen-deep">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{note}</p>
    </article>
  );
}
