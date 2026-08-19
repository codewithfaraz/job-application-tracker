import "server-only";

import { AIServiceError } from "@/lib/ai/errors";
import {
  buildJobExtractionPrompt,
  JOB_EXTRACTION_PROMPT_VERSION,
} from "@/lib/ai/prompts/job-extraction";
import {
  jobExtractionSchema,
  type JobExtraction,
} from "@/lib/ai/schemas";
import type { Json } from "@/types/database";

import {
  assertAIText,
  MAX_AI_JOB_DESCRIPTION_LENGTH,
} from "./input-limits";
import {
  runStructuredOperation,
  type AIServiceContext,
  type AIServiceResult,
} from "./run-structured-operation";

export type ExtractJobDescriptionInput = {
  jobDescription: string;
  applicationId?: string | null;
  regenerate?: boolean;
};

export async function extractJobDescription(
  context: AIServiceContext,
  input: ExtractJobDescriptionInput,
): Promise<AIServiceResult<JobExtraction>> {
  assertAIText(
    input.jobDescription,
    "Job description",
    MAX_AI_JOB_DESCRIPTION_LENGTH,
    "missing_job_description",
  );

  const prompt = buildJobExtractionPrompt(input.jobDescription);
  const result = await runStructuredOperation(context, {
    applicationId: input.applicationId ?? null,
    operation: "job_extraction",
    promptVersion: JOB_EXTRACTION_PROMPT_VERSION,
    schemaName: "job_extraction",
    schemaDescription: "Facts extracted only from the supplied job description.",
    schema: jobExtractionSchema,
    system: prompt.system,
    prompt: prompt.prompt,
    hashInputs: { jobDescription: input.jobDescription },
    maxOutputTokens: 3_500,
    regenerate: input.regenerate,
  });

  if (input.applicationId) {
    const updateResult = await context.supabase
      .from("applications")
      .update({
        ai_summary: result.data.summary,
        ai_extracted_data: JSON.parse(JSON.stringify(result.data)) as Json,
      })
      .eq("id", input.applicationId)
      .eq("user_id", context.userId)
      .select("id")
      .maybeSingle();

    if (updateResult.error) {
      throw new AIServiceError(
        "storage",
        "The analysis was generated but could not be attached to the application.",
      );
    }

    if (!updateResult.data) {
      throw new AIServiceError("not_found", "Application not found.");
    }
  }

  return result;
}
