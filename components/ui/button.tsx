import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/components/ui/cn";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-[background-color,color,border-color,transform] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "border border-cobalt bg-cobalt text-white hover:border-[#274dad] hover:bg-[#274dad]",
        evergreen:
          "border border-evergreen bg-evergreen text-white hover:border-evergreen-deep hover:bg-evergreen-deep",
        secondary:
          "border border-border bg-secondary text-secondary-foreground hover:bg-[#d5dfda]",
        outline:
          "border border-input bg-paper text-foreground hover:border-evergreen hover:bg-secondary",
        ghost:
          "border border-transparent bg-transparent text-foreground hover:bg-secondary",
        destructive:
          "border border-destructive bg-destructive text-destructive-foreground hover:bg-[#913a39]",
        link: "h-auto rounded-none border-0 bg-transparent p-0 text-cobalt underline-offset-4 hover:underline active:scale-100",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-12 px-5 text-base",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
