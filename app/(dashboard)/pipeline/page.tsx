import Link from "next/link";

import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getPipelineBoard } from "@/lib/data/pipeline";

export const metadata = { title: "Pipeline" };

export default async function PipelinePage() {
  const board = await getPipelineBoard();

  return (
    <div className="mx-auto w-full max-w-[100rem]">
      <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cobalt">
            Case desk / Pipeline
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-none text-evergreen-deep sm:text-5xl">
            Opportunity pipeline
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Move a case through your process. Every change is recorded in its timeline.
          </p>
        </div>
        <Button asChild>
          <Link href="/applications/new">Add application</Link>
        </Button>
      </header>

      <div className="mt-6">
        {board.totalApplications === 0 ? (
          <EmptyState
            eyebrow="No active cases"
            title="Your pipeline is ready"
            description="Add an application and it will appear in its current stage here."
            action={
              <Button asChild>
                <Link href="/applications/new">Add application</Link>
              </Button>
            }
          />
        ) : (
          <PipelineBoard board={board} />
        )}
      </div>
    </div>
  );
}
