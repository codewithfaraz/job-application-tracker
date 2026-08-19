"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto grid min-h-[28rem] w-full max-w-3xl place-items-center rounded-lg border border-dashed border-input bg-paper p-8 text-center">
      <div>
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-rose">Workspace unavailable</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-evergreen-deep">This case view could not be loaded</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">Your data was not changed. Check the Supabase connection and try again.</p>
        <div className="mt-6 flex justify-center gap-2"><Button onClick={reset}>Try again</Button><Button asChild variant="outline"><Link href="/dashboard">Dashboard</Link></Button></div>
      </div>
    </div>
  );
}
