"use client";

import { Button } from "@/components/ui/button";

export default function PipelineError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto grid min-h-[26rem] w-full max-w-3xl place-items-center rounded-lg border border-dashed border-input bg-paper p-8 text-center">
      <div>
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-rose">
          Pipeline unavailable
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-evergreen-deep">
          We could not open your pipeline
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          Your applications are unchanged. Check the connection and try again.
        </p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
