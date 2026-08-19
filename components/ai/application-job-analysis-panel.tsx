"use client";

import { FileSearch, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { analyzeApplicationJobDescriptionAction } from "@/actions/ai";
import { AIActionFeedback, AIArtifactMeta } from "@/components/ai/ai-action-feedback";
import { JobExtractionArtifact } from "@/components/ai/job-extraction-artifact";
import { StoredAIHistory, StoredAIResult } from "@/components/ai/stored-ai-history";
import type { AIAvailability } from "@/components/ai/types";
import { Button } from "@/components/ui/button";
import { INITIAL_AI_ACTION_STATE } from "@/lib/ai/action-state";
import type { JobExtraction } from "@/lib/ai/schemas";
import type { StoredAIArtifact } from "@/lib/data/ai";

type ApplicationJobAnalysisPanelProps = {
  applicationId: string;
  hasJobDescription: boolean;
  savedExtraction: JobExtraction | null;
  savedSummary: string | null;
  history: StoredAIArtifact[];
  availability: AIAvailability;
};

function ApplicationJobAnalysisPanel({
  applicationId,
  hasJobDescription,
  savedExtraction,
  savedSummary,
  history,
  availability,
}: ApplicationJobAnalysisPanelProps) {
  const [state, action, pending] = useActionState(
    analyzeApplicationJobDescriptionAction,
    INITIAL_AI_ACTION_STATE,
  );
  const freshExtraction =
    state.artifact?.kind === "job-extraction" ? state.artifact.data : null;
  const latestStored = history[0];
  const hasPriorAnalysis = Boolean(
    freshExtraction || latestStored || savedExtraction || savedSummary,
  );
  const canRun = availability.enabled && hasJobDescription && !pending;

  return (
    <div className="space-y-5">
      <PanelIntro
        title="Job-description analysis"
        description="Extract role facts from the exact text saved in this case. Nothing is inferred from the posting URL."
        icon={<FileSearch aria-hidden="true" />}
      />

      <div className="flex flex-col gap-3 rounded-md border border-border bg-[#f4f6f4] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-evergreen-deep">
            {hasPriorAnalysis ? "Refresh the saved analysis" : "Create a structured analysis"}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            This runs only after you confirm with the button.
          </p>
        </div>
        <form action={action}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <Button
            type="submit"
            variant="evergreen"
            size="sm"
            disabled={!canRun}
            name={hasPriorAnalysis ? "regenerate" : undefined}
            value={hasPriorAnalysis ? "true" : undefined}
          >
            {hasPriorAnalysis ? <RefreshCw aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
            {pending
              ? "Analyzing…"
              : hasPriorAnalysis
                ? "Regenerate analysis"
                : "Analyze job description"}
          </Button>
        </form>
      </div>

      <PrerequisiteMessage
        availability={availability}
        missing={!hasJobDescription}
        missingCopy="Add the original job description before running analysis."
        editHref={`/applications/${applicationId}/edit`}
      />
      <AIActionFeedback state={state} pending={pending} pendingMessage="Extracting facts from the saved description…" />

      {freshExtraction ? (
        <ResultDocket label="Latest analysis">
          <JobExtractionArtifact data={freshExtraction} />
          <AIArtifactMeta
            cached={state.cached}
            runId={state.runId}
            provider={availability.enabled ? availability.provider : undefined}
            model={availability.enabled ? availability.model : undefined}
            mode="Job extraction"
          />
        </ResultDocket>
      ) : latestStored ? (
        <ResultDocket label="Latest saved analysis">
          <StoredAIResult result={latestStored} />
        </ResultDocket>
      ) : savedExtraction ? (
        <ResultDocket label="Saved analysis">
          <JobExtractionArtifact data={savedExtraction} />
          <AIArtifactMeta saved mode="Job extraction" />
        </ResultDocket>
      ) : savedSummary ? (
        <ResultDocket label="Saved summary">
          <p className="text-sm leading-7">{savedSummary}</p>
          <AIArtifactMeta saved mode="Job extraction" />
        </ResultDocket>
      ) : (
        <EmptyResult copy="No job-description analysis has been generated for this case." />
      )}

      <StoredAIHistory
        results={history}
        excludeId={freshExtraction ? state.runId : latestStored?.id}
      />
    </div>
  );
}

function PanelIntro({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-paper text-cobalt [&_svg]:size-4 [&_svg]:stroke-[2]">{icon}</span>
      <div><h3 className="font-display text-xl font-semibold text-evergreen-deep">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p></div>
    </div>
  );
}

function PrerequisiteMessage({ availability, missing, missingCopy, editHref }: { availability: AIAvailability; missing: boolean; missingCopy: string; editHref: string }) {
  if (availability.enabled && !missing) return null;
  return (
    <div className="rounded-md border border-amber/30 bg-amber-soft p-4 text-xs leading-5 text-muted-foreground">
      {!availability.enabled ? <p>{availability.message} Normal case tracking remains available.</p> : null}
      {missing ? <p className={!availability.enabled ? "mt-1" : undefined}>{missingCopy} <Link href={editHref} className="font-semibold text-cobalt underline-offset-4 hover:underline">Edit case</Link></p> : null}
    </div>
  );
}

function ResultDocket({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-paper p-4 sm:p-5">
      <p className="mb-5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-cobalt">{label}</p>
      {children}
    </section>
  );
}

function EmptyResult({ copy }: { copy: string }) {
  return <p className="rounded-md border border-dashed border-input bg-paper p-5 text-center text-xs leading-5 text-muted-foreground">{copy}</p>;
}

export { ApplicationJobAnalysisPanel, EmptyResult, PanelIntro, PrerequisiteMessage, ResultDocket };
