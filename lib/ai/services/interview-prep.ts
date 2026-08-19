import "server-only";

import {
  buildInterviewPrepPrompt,
  INTERVIEW_PREP_JD_PROMPT_VERSION,
  INTERVIEW_PREP_JD_RESUME_PROMPT_VERSION,
} from "@/lib/ai/prompts/interview-prep";
import {
  interviewPrepSchema,
  interviewPrepWithoutResumeSchema,
  type InterviewPrep,
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

export type InterviewPrepInput = {
  applicationId: string;
  jobDescription: string;
  resumeText?: string | null;
  regenerate?: boolean;
};

export async function prepareForInterview(
  context: AIServiceContext,
  input: InterviewPrepInput,
): Promise<AIServiceResult<InterviewPrep>> {
  assertAIText(
    input.jobDescription,
    "Job description",
    MAX_AI_JOB_DESCRIPTION_LENGTH,
    "missing_job_description",
  );

  const resumeText = input.resumeText ?? null;
  if (resumeText !== null) {
    assertAIText(
      resumeText,
      "Resume text",
      MAX_AI_RESUME_TEXT_LENGTH,
      "missing_resume",
    );
    assertCombinedInputLength(input.jobDescription, resumeText);
  }

  const usesResume = resumeText !== null;
  const prompt = buildInterviewPrepPrompt(input.jobDescription, resumeText);

  return runStructuredOperation(context, {
    applicationId: input.applicationId,
    operation: usesResume ? "interview_prep_jd_resume" : "interview_prep_jd",
    promptVersion: usesResume
      ? INTERVIEW_PREP_JD_RESUME_PROMPT_VERSION
      : INTERVIEW_PREP_JD_PROMPT_VERSION,
    schemaName: "interview_preparation",
    schemaDescription:
      "Grounded interview preparation based only on supplied application text.",
    schema: usesResume
      ? interviewPrepSchema
      : interviewPrepWithoutResumeSchema,
    system: prompt.system,
    prompt: prompt.prompt,
    hashInputs: {
      jobDescription: input.jobDescription,
      ...(resumeText !== null ? { resumeText } : {}),
    },
    maxOutputTokens: 5_000,
    regenerate: input.regenerate,
  });
}
