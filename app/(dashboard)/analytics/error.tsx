"use client";

import { Button } from "@/components/ui/button";

export default function AnalyticsError({ reset }: { reset: () => void }) {
  return <div className="mx-auto grid min-h-96 max-w-3xl place-items-center rounded-lg border border-dashed border-input bg-paper p-8 text-center"><div><p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-rose">Analytics unavailable</p><h1 className="mt-3 font-display text-3xl font-semibold text-evergreen-deep">We could not calculate this view</h1><p className="mt-2 text-sm text-muted-foreground">No records were changed. Try the query again.</p><Button className="mt-5" onClick={reset}>Try again</Button></div></div>;
}
