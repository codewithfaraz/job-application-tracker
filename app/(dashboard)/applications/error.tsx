"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ApplicationsError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[86rem]">
      <EmptyState
        eyebrow="Case desk unavailable"
        title="Applications could not be loaded"
        description="Your records are still safe. Check the connection and try loading the case desk again."
        icon={<AlertTriangle aria-hidden="true" className="size-5" strokeWidth={2} />}
        action={<Button onClick={reset}><RotateCcw aria-hidden="true" /> Try again</Button>}
        className="min-h-[32rem]"
      />
    </div>
  );
}
