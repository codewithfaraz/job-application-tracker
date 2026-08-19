import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness } from "lucide-react";

import { StageChangeForm } from "@/components/pipeline/stage-change-form";
import { Badge } from "@/components/ui/badge";
import type { PipelineBoard as PipelineBoardData } from "@/lib/pipeline/types";

export function PipelineBoard({ board }: { board: PipelineBoardData }) {
  const stageChoices = board.stages.map(({ id, name, isActive }) => ({
    id,
    name,
    isActive,
  }));

  return (
    <div className="overflow-x-auto pb-4">
      <div className="grid min-w-max auto-cols-[18rem] grid-flow-col gap-4">
        {board.stages.map((stage) => (
          <section
            key={stage.id}
            aria-labelledby={`pipeline-stage-${stage.id}`}
            className="flex max-h-[calc(100vh-16rem)] min-h-[24rem] flex-col rounded-lg border border-border bg-[#e8ece9]"
          >
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h2
                  id={`pipeline-stage-${stage.id}`}
                  className="truncate font-display text-base font-semibold text-evergreen-deep"
                >
                  {stage.name}
                </h2>
                <p className="mt-0.5 font-mono text-[0.58rem] uppercase tracking-[0.1em] text-muted-foreground">
                  {stage.category.replaceAll("_", " ")}
                </p>
              </div>
              <Badge variant={stage.isTerminal ? "neutral" : "outline"}>
                {stage.applications.length}
              </Badge>
            </header>

            <div className="space-y-3 overflow-y-auto p-3">
              {stage.applications.length === 0 ? (
                <div className="grid min-h-28 place-items-center rounded-md border border-dashed border-input bg-paper/50 p-4 text-center">
                  <p className="text-xs leading-5 text-muted-foreground">
                    No applications in this stage.
                  </p>
                </div>
              ) : (
                stage.applications.map((application) => (
                  <article
                    key={application.id}
                    className="rounded-md border border-border bg-paper p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold uppercase tracking-wide text-cobalt">
                          {application.companyName}
                        </p>
                        <h3 className="mt-1 line-clamp-2 font-display text-lg font-semibold leading-tight text-evergreen-deep">
                          {application.jobTitle}
                        </h3>
                      </div>
                      <Link
                        href={`/applications/${application.id}`}
                        aria-label={`Open ${application.jobTitle} at ${application.companyName}`}
                        className="grid size-8 shrink-0 place-items-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-cobalt hover:text-cobalt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
                      >
                        <ArrowUpRight aria-hidden="true" className="size-4" />
                      </Link>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <BriefcaseBusiness aria-hidden="true" className="size-3.5" />
                      <span className="truncate">Found via {application.sourceName}</span>
                    </div>
                    <StageChangeForm
                      applicationId={application.id}
                      currentStageId={application.currentStageId}
                      stages={stageChoices}
                    />
                  </article>
                ))
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
