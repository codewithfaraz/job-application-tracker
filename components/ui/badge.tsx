import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/components/ui/cn";

const badgeVariants = cva(
  "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.65rem] font-semibold uppercase leading-none tracking-[0.08em]",
  {
    variants: {
      variant: {
        default: "border-[#c8d5fb] bg-cobalt-soft text-accent-foreground",
        neutral: "border-border bg-muted text-muted-foreground",
        success: "border-[#c8dacd] bg-mint-soft text-evergreen",
        warning: "border-[#e7cfad] bg-amber-soft text-[#865416]",
        destructive: "border-[#e8c5c4] bg-rose-soft text-rose",
        outline: "border-input bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
