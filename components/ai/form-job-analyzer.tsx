"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { useActionState } from "react";

import { analyzePastedJobDescriptionAction } from "@/actions/ai";
import { AIActionFeedback, AIArtifactMeta } from "@/components/ai/ai-action-feedback";
import {
  JobExtractionReview,
  type JobExtractionFormPatch,
} from "@/components/ai/job-extraction-artifact";
import type { AIAvailability } from "@/components/ai/types";
import { Button } from "@/components/ui/button";
import {
  INITIAL_AI_ACTION_STATE,
} from "@/lib/ai/action-state";

type FormJobAnalyzerProps = {
  jobDescription: string;
  availability: AIAvailability;
  onApply: (patch: JobExtractionFormPatch) => void;
};

function FormJobAnalyzer({
  jobDescription,
  availability,
  onApply,
}: FormJobAnalyzerProps) {
  const [state, action, pending] = useActionState(
    analyzePastedJobDescriptionAction,
    INITIAL_AI_ACTION_STATE,
  );
  const extraction =
    state.artifact?.kind === "job-extraction" ? state.artifact.data : null;
  const hasDescription = jobDescription.trim().length > 0;
  const canAnalyze = availability.enabled && hasDescription && !pending;

  return (
    <div className="space-y-4 rounded-md border border-dashed border-input bg-[#f4f6f4] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <Sparkles
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-cobalt"
            strokeWidth={2}
          />
          <div>
            <p className="text-sm font-semibold text-evergreen-deep">
              Analyze job description
            </p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              Runs only when you click. Review every extracted value before it
              reaches the form.
            </p>
          </div>
        </div>
        <Button
          type="submit"
          formAction={action}
          formNoValidate
          variant="outline"
          size="sm"
          disabled={!canAnalyze}
          name={extraction ? "regenerate" : undefined}
          value={extraction ? "true" : undefined}
        >
          {extraction ? (
            <RefreshCw aria-hidden="true" />
          ) : (
            <Sparkles aria-hidden="true" />
          )}
          {pending
            ? "Analyzing…"
            : extraction
              ? "Regenerate"
              : "Analyze with AI"}
        </Button>
      </div>

      {!availability.enabled ? (
        <p className="rounded-md border border-amber/30 bg-amber-soft px-3 py-2 text-xs leading-5 text-muted-foreground">
          {availability.message} You can keep completing and saving this form
          without AI.
        </p>
      ) : !hasDescription ? (
        <p className="text-xs leading-5 text-muted-foreground">
          Paste the original job description above to enable analysis.
        </p>
      ) : null}

      <AIActionFeedback
        state={state}
        pending={pending}
        pendingMessage="Reading the pasted description…"
      />

      {extraction ? (
        <div className="space-y-3">
          <JobExtractionReview
            key={state.runId ?? "latest-extraction"}
            data={extraction}
            onApply={onApply}
          />
          <AIArtifactMeta
            cached={state.cached}
            runId={state.runId}
            provider={availability.enabled ? availability.provider : undefined}
            model={availability.enabled ? availability.model : undefined}
          />
        </div>
      ) : null}
    </div>
  );
}

export { FormJobAnalyzer };
export type { FormJobAnalyzerProps };
