import { cn } from "@/components/ui/cn";

type RouteSpineStep = {
  label: string;
  value: string;
  detail?: string;
  state?: "complete" | "current" | "pending";
};

type RouteSpineProps = {
  steps: RouteSpineStep[];
  label?: string;
  className?: string;
};

function RouteSpine({
  steps,
  label = "Application route",
  className,
}: RouteSpineProps) {
  return (
    <ol
      aria-label={label}
      className={cn("grid grid-cols-1 sm:grid-cols-3", className)}
    >
      {steps.map((step) => {
        const state = step.state ?? "pending";

        return (
          <li
            key={`${step.label}-${step.value}`}
            aria-current={state === "current" ? "step" : undefined}
            className="relative min-w-0 border-l border-border pb-6 pl-6 last:pb-0 sm:border-l-0 sm:border-t sm:pb-0 sm:pl-0 sm:pr-6 sm:pt-5 sm:last:pr-0"
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute -left-[5px] top-0 size-[9px] rounded-full border-2 border-paper sm:-top-[5px] sm:left-0",
                state === "complete" && "bg-evergreen",
                state === "current" && "bg-cobalt",
                state === "pending" && "bg-input",
              )}
            />
            <span className="block font-mono text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {step.label}
            </span>
            <span className="mt-1.5 block truncate text-sm font-semibold text-evergreen-deep">
              {step.value}
            </span>
            {step.detail ? (
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {step.detail}
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export { RouteSpine };
export type { RouteSpineProps, RouteSpineStep };
