import * as React from "react";

import { cn } from "@/components/ui/cn";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-28 w-full resize-y rounded-md border border-input bg-paper px-3 py-2.5 text-sm leading-6 text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/75 focus-visible:border-cobalt focus-visible:ring-2 focus-visible:ring-cobalt/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/15",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
