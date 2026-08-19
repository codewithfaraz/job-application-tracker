"use client";

import { MessagesSquare, RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { prepareApplicationInterviewAction } from "@/actions/ai";
import { AIActionFeedback, AIArtifactMeta } from "@/components/ai/ai-action-feedback";
import {
  EmptyResult,
  PanelIntro,
  ResultDocket,
} from "@/components/ai/application-job-analysis-panel";
import { InterviewPrepArtifact } from "@/components/ai/interview-prep-artifact";
import { StoredAIHistory, StoredAIResult } from "@/components/ai/stored-ai-history";
import type { AIAvailability } from "@/components/ai/types";
import { Button } from "@/components/ui/button";
import { INITIAL_AI_ACTION_STATE } from "@/lib/ai/action-state";
import type { StoredAIArtifact } from "@/lib/data/ai";

type PrepMode = "jd" | "jd-resume";

type ApplicationInterviewPrepPanelProps = {
  applicationId: string;
  hasJobDescription: boolean;
  resume: { name: string } | null;
  history: StoredAIArtifact[];
  availability: AIAvailability;
};

function ApplicationInterviewPrepPanel({
  applicationId,
  hasJobDescription,
  resume,
  history,
  availability,
}: ApplicationInterviewPrepPanelProps) {
  const [mode, setMode] = useState<PrepMode>("jd");
  const [submittedMode, setSubmittedMode] = useState<PrepMode>("jd");
  const [state, action, pending] = useActionState(
    prepareApplicationInterviewAction,
    INITIAL_AI_ACTION_STATE,
  );
  const freshPrep =
    state.artifact?.kind === "interview-prep" ? state.artifact.data : null;
  const matchingHistory = history.filter((result) =>
    mode === "jd"
      ? result.operation === "interview_prep_jd"
      : result.operation === "interview_prep_jd_resume",
  );
  const latestStored = matchingHistory[0];
  const hasPriorForMode = matchingHistory.length > 0 || Boolean(freshPrep && submittedMode === mode);
  const modeReady = mode === "jd" || Boolean(resume);
  const canRun = availability.enabled && hasJobDescription && modeReady && !pending;

  return (
    <div className="space-y-5">
      <PanelIntro
        title="Interview preparation"
        description="Generate a focused preparation brief from the saved JD, optionally grounded in the submitted resume."
        icon={<MessagesSquare aria-hidden="true" />}
      />

      <form
        action={action}
        onSubmit={() => setSubmittedMode(mode)}
        className="rounded-md border border-border bg-[#f4f6f4] p-4"
      >
        <input type="hidden" name="applicationId" value={applicationId} />
        <input type="hidden" name="mode" value={mode} />
        <fieldset>
          <legend className="text-sm font-semibold text-evergreen-deep">
            Preparation source
          </legend>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Choose the evidence this run may use.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ModeChoice
              id="prep-mode-jd"
              title="Job description only"
              description="Role requirements and likely questions."
              checked={mode === "jd"}
              onChange={() => setMode("jd")}
              disabled={pending}
            />
            <ModeChoice
              id="prep-mode-resume"
              title="JD + submitted resume"
              description={resume ? `Ground examples in ${resume.name}.` : "Select a resume to use this mode."}
              checked={mode === "jd-resume"}
              onChange={() => setMode("jd-resume")}
              disabled={pending || !resume}
            />
          </div>
        </fieldset>

        <div className="mt-4 flex justify-end">
          <Button
            type="submit"
            variant="evergreen"
            size="sm"
            disabled={!canRun}
            name={hasPriorForMode ? "regenerate" : undefined}
            value={hasPriorForMode ? "true" : undefined}
          >
            {hasPriorForMode ? <RefreshCw aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
            {pending
              ? "Preparing…"
              : hasPriorForMode
                ? "Regenerate prep"
                : "Generate interview prep"}
          </Button>
        </div>
      </form>

      {!availability.enabled || !hasJobDescription ? (
        <div className="rounded-md border border-amber/30 bg-amber-soft p-4 text-xs leading-5 text-muted-foreground">
          {!availability.enabled ? <p>{availability.message} Normal case tracking remains available.</p> : null}
          {!hasJobDescription ? <p className={!availability.enabled ? "mt-1" : undefined}>Add a job description before generating preparation. <Link href={`/applications/${applicationId}/edit`} className="font-semibold text-cobalt underline-offset-4 hover:underline">Edit case</Link></p> : null}
        </div>
      ) : null}

      <AIActionFeedback state={state} pending={pending} pendingMessage="Building an evidence-grounded interview brief…" />

      {freshPrep ? (
        <ResultDocket label="Latest preparation brief">
          <InterviewPrepArtifact data={freshPrep} />
          <AIArtifactMeta
            cached={state.cached}
            runId={state.runId}
            provider={availability.enabled ? availability.provider : undefined}
            model={availability.enabled ? availability.model : undefined}
            mode={submittedMode === "jd" ? "JD only" : "JD + resume"}
          />
        </ResultDocket>
      ) : latestStored ? (
        <ResultDocket label="Latest saved preparation"><StoredAIResult result={latestStored} /></ResultDocket>
      ) : (
        <EmptyResult copy="No interview preparation has been generated for this application." />
      )}

      <StoredAIHistory results={history} excludeId={freshPrep ? state.runId : latestStored?.id} />
    </div>
  );
}

function ModeChoice({
  id,
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className="cursor-pointer rounded-md border border-input bg-paper p-3 has-[:checked]:border-cobalt has-[:checked]:bg-cobalt-soft/60 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-55"
    >
      <input
        id={id}
        type="radio"
        name="prep-mode-choice"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
      <span className="block text-sm font-semibold text-evergreen-deep">{title}</span>
      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
    </label>
  );
}

export { ApplicationInterviewPrepPanel };
