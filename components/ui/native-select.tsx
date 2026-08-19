import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/components/ui/cn";

function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <span className="relative block">
      <select
        data-slot="native-select"
        className={cn(
          "flex h-10 w-full appearance-none rounded-md border border-input bg-paper py-2 pl-3 pr-9 text-sm text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-cobalt focus-visible:ring-2 focus-visible:ring-cobalt/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/15",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={2}
      />
    </span>
  );
}

export { NativeSelect };
