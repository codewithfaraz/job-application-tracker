import {
  AlertTriangle,
  CheckCircle2,
  Database,
  LoaderCircle,
  ServerCog,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { AIActionState } from "@/lib/ai/action-state";

type AIActionFeedbackProps = {
  state: AIActionState;
  pending: boolean;
  pendingMessage: string;
};

function AIActionFeedback({
  state,
  pending,
  pendingMessage,
}: AIActionFeedbackProps) {
  if (pending) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-start gap-3 rounded-md border border-cobalt/20 bg-cobalt-soft/55 p-4"
      >
        <LoaderCircle
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 animate-spin text-cobalt"
          strokeWidth={2}
        />
        <div>
          <p className="text-sm font-semibold text-evergreen-deep">
            {pendingMessage}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Keep this page open. Your application data remains unchanged until
            you choose what to apply or save.
          </p>
        </div>
      </div>
    );
  }

  if (state.status === "disabled" || state.status === "error") {
    const fieldMessages = Object.values(state.fieldErrors ?? {}).flat();

    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-md border border-amber/30 bg-amber-soft p-4"
      >
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-amber"
          strokeWidth={2}
        />
        <div>
          <p className="text-sm font-semibold text-evergreen-deep">
            {state.status === "disabled"
              ? "AI is not configured"
              : "The analysis did not finish"}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {state.message ?? "Try the action again in a moment."}
          </p>
          {fieldMessages.length > 0 ? (
            <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
              {fieldMessages.map((message) => (
                <li key={message}>— {message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 text-xs font-medium text-evergreen"
      >
        <CheckCircle2 aria-hidden="true" className="size-4" strokeWidth={2} />
        {state.message ?? "Analysis complete."}
      </div>
    );
  }

  return null;
}

type AIArtifactMetaProps = {
  cached?: boolean;
  runId?: string;
  saved?: boolean;
  mode?: string;
  provider?: string;
  model?: string;
  generatedAt?: string | null;
  promptVersion?: string;
};

function AIArtifactMeta({
  cached,
  runId,
  saved = false,
  mode,
  provider = "OpenAI",
  model,
  generatedAt,
  promptVersion,
}: AIArtifactMetaProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 font-mono text-[0.6rem] uppercase tracking-[0.09em] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <ServerCog aria-hidden="true" className="size-3.5" strokeWidth={2} />
        Provider / {provider.toLowerCase() === "openai" ? "OpenAI" : provider}
      </span>
      {model ? <span>Model / {model}</span> : null}
      <span className="inline-flex items-center gap-1.5">
        <Database aria-hidden="true" className="size-3.5" strokeWidth={2} />
        {saved ? "Saved to case" : cached ? "Cached result" : "New run"}
      </span>
      {mode ? <Badge variant="outline">{mode}</Badge> : null}
      {runId ? (
        <span title={runId}>Run / {runId.slice(0, 8)}</span>
      ) : saved ? (
        <span>Run / prior analysis</span>
      ) : null}
      {generatedAt ? (
        <time dateTime={generatedAt}>Generated / {formatTimestamp(generatedAt)}</time>
      ) : null}
      {promptVersion ? <span>Prompt / {promptVersion}</span> : null}
    </div>
  );
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

export { AIActionFeedback, AIArtifactMeta };
export type { AIActionFeedbackProps, AIArtifactMetaProps };
