"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { FileSearch, MessagesSquare, Scale, ShieldCheck, Sparkles } from "lucide-react";

import { ApplicationInterviewPrepPanel } from "@/components/ai/application-interview-prep-panel";
import { ApplicationJobAnalysisPanel } from "@/components/ai/application-job-analysis-panel";
import { ApplicationResumeComparisonPanel } from "@/components/ai/application-resume-comparison-panel";
import type { AIAvailability } from "@/components/ai/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import type { JobExtraction } from "@/lib/ai/schemas";
import type { StoredAIArtifact } from "@/lib/data/ai";

type ApplicationAIWorkbenchProps = {
  applicationId: string;
  hasJobDescription: boolean;
  resume: { name: string } | null;
  savedExtraction: JobExtraction | null;
  savedSummary: string | null;
  history: StoredAIArtifact[];
  availability: AIAvailability;
};

const tools = [
  { id: "analysis" as const, label: "Analyze JD", description: "Extract role facts", icon: FileSearch },
  { id: "comparison" as const, label: "Compare resume", description: "Find evidence and gaps", icon: Scale },
  { id: "preparation" as const, label: "Interview prep", description: "Build a focused brief", icon: MessagesSquare },
];

function ApplicationAIWorkbench({
  applicationId,
  hasJobDescription,
  resume,
  savedExtraction,
  savedSummary,
  history,
  availability,
}: ApplicationAIWorkbenchProps) {
  const extractionHistory = history.filter((result) => result.artifact.kind === "job-extraction");
  const comparisonHistory = history.filter((result) => result.artifact.kind === "resume-comparison");
  const preparationHistory = history.filter((result) => result.artifact.kind === "interview-prep");

  return (
    <section id="ai-workbench" aria-labelledby="ai-workbench-heading" className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-4 border-b border-border bg-[#f4f6f4] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-paper text-cobalt">
            <Sparkles aria-hidden="true" className="size-5" strokeWidth={2} />
          </span>
          <div>
            <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-cobalt">Evidence desk</p>
            <h2 id="ai-workbench-heading" className="mt-1 font-display text-2xl font-semibold text-evergreen-deep">AI workbench</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Use only the job description and resume stored in this case. Every run is explicit and saved for later review.</p>
          </div>
        </div>
        <Badge variant={availability.enabled ? "success" : "warning"}>
          {availability.enabled ? "AI ready" : "AI not configured"}
        </Badge>
      </div>

      <Tabs.Root defaultValue="analysis">
        <Tabs.List aria-label="AI tools" className="grid border-b border-border sm:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Tabs.Trigger
                key={tool.id}
                value={tool.id}
                className={cn(
                  "group flex items-center gap-3 border-b border-border bg-paper px-4 py-4 text-left text-muted-foreground outline-none transition-colors last:border-b-0 hover:bg-[#f4f6f4] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cobalt data-[state=active]:bg-cobalt-soft/55 data-[state=active]:text-evergreen-deep sm:border-b-0 sm:border-r sm:last:border-r-0",
                )}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0 group-data-[state=active]:text-cobalt" strokeWidth={2} />
                <span><span className="block text-sm font-semibold">{tool.label}</span><span className="mt-0.5 block text-[0.68rem]">{tool.description}</span></span>
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        <div className="p-5 sm:p-6">
          <Tabs.Content value="analysis" forceMount className="outline-none data-[state=inactive]:hidden">
          <ApplicationJobAnalysisPanel applicationId={applicationId} hasJobDescription={hasJobDescription} savedExtraction={savedExtraction} savedSummary={savedSummary} history={extractionHistory} availability={availability} />
          </Tabs.Content>
          <Tabs.Content value="comparison" forceMount className="outline-none data-[state=inactive]:hidden">
          <ApplicationResumeComparisonPanel applicationId={applicationId} hasJobDescription={hasJobDescription} resume={resume} history={comparisonHistory} availability={availability} />
          </Tabs.Content>
          <Tabs.Content value="preparation" forceMount className="outline-none data-[state=inactive]:hidden">
          <ApplicationInterviewPrepPanel applicationId={applicationId} hasJobDescription={hasJobDescription} resume={resume} history={preparationHistory} availability={availability} />
          </Tabs.Content>
        </div>
      </Tabs.Root>

      <div className="flex items-center gap-2 border-t border-border bg-[#f4f6f4] px-5 py-3 text-xs text-muted-foreground sm:px-6">
        <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-evergreen" strokeWidth={2} />
        No URL fetching, no automatic runs, and no changes to application fields without your review.
      </div>
    </section>
  );
}

export { ApplicationAIWorkbench };
