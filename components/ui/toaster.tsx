"use client";

import { Toaster } from "sonner";

function AppToaster() {
  return (
    <Toaster
      position="top-right"
      closeButton
      gap={8}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 rounded-lg border border-border bg-paper p-4 font-sans text-sm text-foreground",
          title: "font-semibold text-evergreen-deep",
          description: "mt-1 text-sm leading-5 text-muted-foreground",
          actionButton:
            "rounded-sm bg-cobalt px-3 py-1.5 text-xs font-semibold text-white",
          cancelButton:
            "rounded-sm border border-input bg-transparent px-3 py-1.5 text-xs font-semibold text-foreground",
          closeButton:
            "rounded-sm border border-border bg-paper text-muted-foreground hover:text-foreground",
        },
      }}
    />
  );
}

export { AppToaster };
