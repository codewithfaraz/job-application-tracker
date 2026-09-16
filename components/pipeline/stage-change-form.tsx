"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { transitionApplicationStageAction } from "@/actions/pipeline";
import { Button } from "@/components/ui/button";
import { initialTransitionApplicationState } from "@/lib/action-states";
import type { PipelineStage } from "@/lib/pipeline/types";

type StageChangeFormProps = {
  applicationId: string;
  currentStageId: string;
  stages: Pick<PipelineStage, "id" | "name" | "isActive">[];
};

export function StageChangeForm({
  applicationId,
  currentStageId,
  stages,
}: StageChangeFormProps) {
  const [state, formAction, pending] = useActionState(
    transitionApplicationStageAction,
    initialTransitionApplicationState,
  );
  const lastMessage = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!state.message || state.message === lastMessage.current) return;
    lastMessage.current = state.message;

    if (state.status === "success") toast.success(state.message);
    if (state.status === "error") toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="mt-4 flex items-center gap-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <label className="sr-only" htmlFor={`stage-${applicationId}`}>
        Move application to stage
      </label>
      <select
        id={`stage-${applicationId}`}
        name="toStageId"
        defaultValue={currentStageId}
        disabled={pending}
        className="h-8 min-w-0 flex-1 rounded-sm border border-input bg-paper px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
      >
        {stages
          .filter((stage) => stage.isActive || stage.id === currentStageId)
          .map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
      </select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? "Moving…" : "Move"}
      </Button>
    </form>
  );
}
