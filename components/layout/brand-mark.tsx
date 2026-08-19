import { cn } from "@/components/ui/cn";

type BrandMarkProps = {
  compact?: boolean;
  className?: string;
};

function BrandMark({ compact = false, className }: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-evergreen bg-evergreen text-white"
      >
        <svg viewBox="0 0 36 36" className="size-9" fill="none">
          <path d="M8 8h8l2.8 3H28v17H8V8Z" fill="currentColor" opacity="0.22" />
          <path d="M8 12h20v16H8V12Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="M13 17h10M13 21h7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M24 7h4v7h-4z" fill="#6f91ec" />
        </svg>
      </span>
      {!compact ? (
        <span className="hidden leading-none min-[375px]:grid">
          <span className="font-display text-lg font-semibold tracking-[-0.03em] text-evergreen-deep">
            Job CRM
          </span>
          <span className="mt-1 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Career case desk
          </span>
        </span>
      ) : null}
    </span>
  );
}

export { BrandMark };
