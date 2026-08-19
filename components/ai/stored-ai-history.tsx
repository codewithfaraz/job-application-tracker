import { ChevronDown, History } from "lucide-react";

import { AIArtifactMeta } from "@/components/ai/ai-action-feedback";
import { InterviewPrepArtifact } from "@/components/ai/interview-prep-artifact";
import { JobExtractionArtifact } from "@/components/ai/job-extraction-artifact";
import { ResumeComparisonArtifact } from "@/components/ai/resume-comparison-artifact";
import type { AIArtifact } from "@/lib/ai/action-state";
import type { StoredAIArtifact } from "@/lib/data/ai";

function AIArtifactView({ artifact }: { artifact: AIArtifact }) {
  if (artifact.kind === "job-extraction") {
    return <JobExtractionArtifact data={artifact.data} />;
  }
  if (artifact.kind === "resume-comparison") {
    return <ResumeComparisonArtifact data={artifact.data} />;
  }
  return <InterviewPrepArtifact data={artifact.data} />;
}

function StoredAIResult({ result }: { result: StoredAIArtifact }) {
  return (
    <div className="space-y-5">
      <AIArtifactView artifact={result.artifact} />
      <AIArtifactMeta
        saved
        runId={result.id}
        provider={providerLabel(result.provider)}
        model={result.model}
        promptVersion={result.promptVersion}
        generatedAt={result.completedAt ?? result.createdAt}
        mode={operationLabel(result.operation)}
      />
    </div>
  );
}

function StoredAIHistory({
  results,
  excludeId,
}: {
  results: StoredAIArtifact[];
  excludeId?: string;
}) {
  const visible = results.filter((result) => result.id !== excludeId);
  if (visible.length === 0) return null;
  const shown = visible.slice(0, 5);

  return (
    <details className="group border-t border-border pt-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-evergreen-deep outline-none focus-visible:underline focus-visible:decoration-cobalt focus-visible:underline-offset-4 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <History aria-hidden="true" className="size-4 text-cobalt" strokeWidth={2} />
          Earlier generated results ({visible.length})
        </span>
        <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" strokeWidth={2} />
      </summary>
      <div className="mt-4 space-y-3">
        {shown.map((result) => (
          <details key={result.id} className="group/item rounded-md border border-border bg-paper">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cobalt [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-sm font-semibold text-evergreen-deep">
                  {artifactLabel(result.artifact)}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {formatTimestamp(result.completedAt ?? result.createdAt)} · {providerLabel(result.provider)} / {result.model}
                </span>
              </span>
              <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open/item:rotate-180" strokeWidth={2} />
            </summary>
            <div className="border-t border-border p-4 sm:p-5">
              <StoredAIResult result={result} />
            </div>
          </details>
        ))}
        {visible.length > shown.length ? (
          <p className="text-xs text-muted-foreground">
            Showing the five most recent prior results.
          </p>
        ) : null}
      </div>
    </details>
  );
}

function providerLabel(provider: string) {
  return provider.toLowerCase() === "openai" ? "OpenAI" : provider;
}

function operationLabel(operation: StoredAIArtifact["operation"]) {
  if (operation === "interview_prep_jd") return "JD only";
  if (operation === "interview_prep_jd_resume") return "JD + resume";
  if (operation === "resume_comparison") return "Resume comparison";
  return "Job extraction";
}

function artifactLabel(artifact: AIArtifact) {
  if (artifact.kind === "job-extraction") return "Job-description analysis";
  if (artifact.kind === "resume-comparison") return "Resume comparison";
  return "Interview preparation";
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

export { AIArtifactView, StoredAIHistory, StoredAIResult };
