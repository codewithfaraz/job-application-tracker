import "server-only";

import type { AIArtifact } from "@/lib/ai/action-state";
import {
  interviewPrepSchema,
  jobExtractionSchema,
  resumeComparisonSchema,
} from "@/lib/ai/schemas";
import { requireVerifiedIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export type StoredAIArtifact = {
  id: string;
  operation: Enums<"ai_operation">;
  artifact: AIArtifact;
  provider: string;
  model: string;
  promptVersion: string;
  createdAt: string;
  completedAt: string | null;
};

function parseStoredArtifact(
  operation: Enums<"ai_operation">,
  result: unknown,
): AIArtifact | null {
  if (operation === "job_extraction") {
    const parsed = jobExtractionSchema.safeParse(result);
    return parsed.success
      ? { kind: "job-extraction", data: parsed.data }
      : null;
  }
  if (operation === "resume_comparison") {
    const parsed = resumeComparisonSchema.safeParse(result);
    return parsed.success
      ? { kind: "resume-comparison", data: parsed.data }
      : null;
  }

  const parsed = interviewPrepSchema.safeParse(result);
  return parsed.success
    ? { kind: "interview-prep", data: parsed.data }
    : null;
}

export async function getApplicationAIHistory(
  applicationId: string,
): Promise<StoredAIArtifact[]> {
  const { userId } = await requireVerifiedIdentity(
    `/applications/${applicationId}`,
  );
  const supabase = await createClient();

  const ownership = await supabase
    .from("applications")
    .select("id")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (ownership.error || !ownership.data) return [];

  const { data, error } = await supabase
    .from("ai_runs")
    .select(
      "id, operation, provider, model, prompt_version, result, created_at, completed_at",
    )
    .eq("user_id", userId)
    .eq("application_id", applicationId)
    .eq("status", "succeeded")
    .order("completed_at", { ascending: false })
    .limit(30);

  if (error) throw new Error("Could not load saved AI results.");

  return data.flatMap((run) => {
    const artifact = parseStoredArtifact(run.operation, run.result);
    return artifact
      ? [
          {
            id: run.id,
            operation: run.operation,
            artifact,
            provider: run.provider,
            model: run.model,
            promptVersion: run.prompt_version,
            createdAt: run.created_at,
            completedAt: run.completed_at,
          },
        ]
      : [];
  });
}
