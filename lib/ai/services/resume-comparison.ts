import "server-only";

import {
  buildResumeComparisonPrompt,
  RESUME_COMPARISON_PROMPT_VERSION,
} from "@/lib/ai/prompts/resume-comparison";
import {
  resumeComparisonSchema,
  type ResumeComparison,
} from "@/lib/ai/schemas";

import {
  assertAIText,
  assertCombinedInputLength,
  MAX_AI_JOB_DESCRIPTION_LENGTH,
  MAX_AI_RESUME_TEXT_LENGTH,
} from "./input-limits";
import {
  runStructuredOperation,
  type AIServiceContext,
  type AIServiceResult,
} from "./run-structured-operation";

export type CompareResumeInput = {
  applicationId: string;
  jobDescription: string;
  resumeText: string;
  regenerate?: boolean;
};

export async function compareResumeToJob(
  context: AIServiceContext,
  input: CompareResumeInput,
): Promise<AIServiceResult<ResumeComparison>> {
  assertAIText(
    input.jobDescription,
    "Job description",
    MAX_AI_JOB_DESCRIPTION_LENGTH,
    "missing_job_description",
  );
  assertAIText(
    input.resumeText,
    "Resume text",
    MAX_AI_RESUME_TEXT_LENGTH,
    "missing_resume",
  );
  assertCombinedInputLength(input.jobDescription, input.resumeText);

  const prompt = buildResumeComparisonPrompt(
    input.jobDescription,
    input.resumeText,
  );

  return runStructuredOperation(context, {
    applicationId: input.applicationId,
    operation: "resume_comparison",
    promptVersion: RESUME_COMPARISON_PROMPT_VERSION,
    schemaName: "resume_comparison",
    schemaDescription:
      "A qualitative, evidence-grounded resume and job-description comparison.",
    schema: resumeComparisonSchema,
    system: prompt.system,
    prompt: prompt.prompt,
    hashInputs: {
      jobDescription: input.jobDescription,
      resumeText: input.resumeText,
    },
    maxOutputTokens: 4_000,
    regenerate: input.regenerate,
  });
}
