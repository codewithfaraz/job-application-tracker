"use client";

import { RefreshCw, Scale, Sparkles } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { compareApplicationResumeAction } from "@/actions/ai";
import { AIActionFeedback, AIArtifactMeta } from "@/components/ai/ai-action-feedback";
import {
  EmptyResult,
  PanelIntro,
  ResultDocket,
} from "@/components/ai/application-job-analysis-panel";
import { ResumeComparisonArtifact } from "@/components/ai/resume-comparison-artifact";
import { StoredAIHistory, StoredAIResult } from "@/components/ai/stored-ai-history";
import type { AIAvailability } from "@/components/ai/types";
import { Button } from "@/components/ui/button";
import { INITIAL_AI_ACTION_STATE } from "@/lib/ai/action-state";
import type { StoredAIArtifact } from "@/lib/data/ai";

type ApplicationResumeComparisonPanelProps = {
  applicationId: string;
  hasJobDescription: boolean;
  resume: { name: string } | null;
  history: StoredAIArtifact[];
  availability: AIAvailability;
};

function ApplicationResumeComparisonPanel({
  applicationId,
  hasJobDescription,
  resume,
  history,
  availability,
}: ApplicationResumeComparisonPanelProps) {
  const [state, action, pending] = useActionState(
    compareApplicationResumeAction,
    INITIAL_AI_ACTION_STATE,
  );
  const freshComparison =
    state.artifact?.kind === "resume-comparison" ? state.artifact.data : null;
  const latestStored = history[0];
  const hasPrior = Boolean(freshComparison || latestStored);
  const canRun = availability.enabled && hasJobDescription && Boolean(resume) && !pending;

  return (
    <div className="space-y-5">
      <PanelIntro
        title="Resume comparison"
        description="Compare the submitted resume with this job description using evidence and practical gaps—not a made-up percentage score."
        icon={<Scale aria-hidden="true" />}
      />

      <div className="flex flex-col gap-3 rounded-md border border-border bg-[#f4f6f4] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-evergreen-deep">
            {resume ? resume.name : "No resume selected"}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            The comparison uses the stored resume text and exact saved JD.
          </p>
        </div>
        <form action={action}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <Button
            type="submit"
            variant="evergreen"
            size="sm"
            disabled={!canRun}
            name={hasPrior ? "regenerate" : undefined}
            value={hasPrior ? "true" : undefined}
          >
            {hasPrior ? <RefreshCw aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
            {pending ? "Comparing…" : hasPrior ? "Regenerate comparison" : "Compare resume"}
          </Button>
        </form>
      </div>

      {!availability.enabled || !hasJobDescription || !resume ? (
        <div className="rounded-md border border-amber/30 bg-amber-soft p-4 text-xs leading-5 text-muted-foreground">
          {!availability.enabled ? <p>{availability.message} Normal case tracking remains available.</p> : null}
          {!hasJobDescription ? <p className={!availability.enabled ? "mt-1" : undefined}>Add a job description before comparing. <Link href={`/applications/${applicationId}/edit`} className="font-semibold text-cobalt underline-offset-4 hover:underline">Edit case</Link></p> : null}
          {!resume ? <p className={!availability.enabled || !hasJobDescription ? "mt-1" : undefined}>Select a submitted resume first. <Link href={`/applications/${applicationId}/edit`} className="font-semibold text-cobalt underline-offset-4 hover:underline">Choose resume</Link></p> : null}
        </div>
      ) : null}

      <AIActionFeedback state={state} pending={pending} pendingMessage="Comparing resume evidence with role requirements…" />

      {freshComparison ? (
        <ResultDocket label="Latest comparison">
          <ResumeComparisonArtifact data={freshComparison} />
          <AIArtifactMeta cached={state.cached} runId={state.runId} provider={availability.enabled ? availability.provider : undefined} model={availability.enabled ? availability.model : undefined} mode="Resume comparison" />
        </ResultDocket>
      ) : latestStored ? (
        <ResultDocket label="Latest saved comparison"><StoredAIResult result={latestStored} /></ResultDocket>
      ) : (
        <EmptyResult copy="No resume comparison has been generated for this application." />
      )}

      <StoredAIHistory results={history} excludeId={freshComparison ? state.runId : latestStored?.id} />
    </div>
  );
}

export { ApplicationResumeComparisonPanel };
