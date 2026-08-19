"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type {
  AIActionState,
  AIArtifact,
} from "@/lib/ai/action-state";
import { AIServiceError } from "@/lib/ai/errors";
import {
  extractJobDescription,
} from "@/lib/ai/services/job-extraction";
import {
  MAX_AI_JOB_DESCRIPTION_LENGTH,
} from "@/lib/ai/services/input-limits";
import { prepareForInterview } from "@/lib/ai/services/interview-prep";
import { compareResumeToJob } from "@/lib/ai/services/resume-comparison";
import type { AIServiceResult } from "@/lib/ai/services/run-structured-operation";
import { requireVerifiedIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const applicationIdSchema = z.string().trim().uuid({
  message: "Application identifier is invalid.",
});

const regenerateSchema = z.preprocess(
  (value) =>
    value === true ||
    (typeof value === "string" &&
      ["1", "on", "true", "yes"].includes(value.toLowerCase())),
  z.boolean(),
);

const pastedJobDescriptionSchema = z.object({
  jobDescription: z
    .string()
    .refine((value) => value.trim().length > 0, "Paste a job description first.")
    .max(
      MAX_AI_JOB_DESCRIPTION_LENGTH,
      "Job description is too long to analyze safely.",
    ),
  regenerate: regenerateSchema,
});

const existingApplicationSchema = z.object({
  applicationId: applicationIdSchema,
  regenerate: regenerateSchema,
});

const interviewPrepActionSchema = existingApplicationSchema.extend({
  mode: z.enum(["jd", "jd-resume"], {
    error: "Choose a valid interview-preparation mode.",
  }),
});

function formString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function pastedJobDescription(formData: FormData) {
  const explicitValue = formData.get("jobDescription");
  return typeof explicitValue === "string"
    ? explicitValue
    : formString(formData, "rawJobDescription");
}

function fieldErrors(error: z.ZodError) {
  const errors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue;
    errors[field] = [...(errors[field] ?? []), issue.message];
  }

  return errors;
}

function validationError(error: z.ZodError): AIActionState {
  return {
    status: "error",
    message: "Check the highlighted fields.",
    fieldErrors: fieldErrors(error),
  };
}

function actionError(error: unknown): AIActionState {
  if (error instanceof AIServiceError) {
    return {
      status: error.code === "disabled" ? "disabled" : "error",
      message: error.message,
    };
  }

  return {
    status: "error",
    message: "AI analysis is temporarily unavailable. Try again later.",
  };
}

function successState<T>(
  result: AIServiceResult<T>,
  artifact: AIArtifact,
): AIActionState {
  return {
    status: "success",
    message: result.cached
      ? "Reused the existing analysis for this exact content."
      : "Analysis complete.",
    artifact,
    cached: result.cached,
    runId: result.runId,
  };
}

async function loadOwnedJobDescription(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  applicationId: string,
) {
  const result = await supabase
    .from("applications")
    .select("id,raw_job_description")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (result.error) {
    throw new AIServiceError(
      "storage",
      "The application could not be loaded.",
    );
  }
  if (!result.data) {
    throw new AIServiceError("not_found", "Application not found.");
  }

  return result.data;
}

async function loadOwnedApplicationAndResume(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  applicationId: string,
) {
  const applicationResult = await supabase
    .from("applications")
    .select("id,raw_job_description,submitted_resume_id")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (applicationResult.error) {
    throw new AIServiceError(
      "storage",
      "The application could not be loaded.",
    );
  }
  if (!applicationResult.data) {
    throw new AIServiceError("not_found", "Application not found.");
  }
  if (!applicationResult.data.submitted_resume_id) {
    throw new AIServiceError(
      "missing_resume",
      "Select a resume for this application first.",
    );
  }

  const resumeResult = await supabase
    .from("resumes")
    .select("id,extracted_text")
    .eq("id", applicationResult.data.submitted_resume_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (resumeResult.error) {
    throw new AIServiceError("storage", "The resume could not be loaded.");
  }
  if (!resumeResult.data) {
    throw new AIServiceError("missing_resume", "The selected resume is unavailable.");
  }
  if (!resumeResult.data.extracted_text?.trim()) {
    throw new AIServiceError(
      "missing_resume",
      "The selected resume does not have extractable text yet.",
    );
  }

  return {
    application: applicationResult.data,
    resumeText: resumeResult.data.extracted_text,
  };
}

export async function analyzePastedJobDescriptionAction(
  _previousState: AIActionState,
  formData: FormData,
): Promise<AIActionState> {
  const { userId } = await requireVerifiedIdentity("/applications/new");
  const parsed = pastedJobDescriptionSchema.safeParse({
    jobDescription: pastedJobDescription(formData),
    regenerate: formString(formData, "regenerate"),
  });

  if (!parsed.success) return validationError(parsed.error);

  try {
    const supabase = await createClient();
    const result = await extractJobDescription(
      { supabase, userId },
      {
        jobDescription: parsed.data.jobDescription,
        applicationId: null,
        regenerate: parsed.data.regenerate,
      },
    );

    return successState(result, {
      kind: "job-extraction",
      data: result.data,
    });
  } catch (error) {
    return actionError(error);
  }
}

export async function analyzeApplicationJobDescriptionAction(
  _previousState: AIActionState,
  formData: FormData,
): Promise<AIActionState> {
  const { userId } = await requireVerifiedIdentity("/applications");
  const parsed = existingApplicationSchema.safeParse({
    applicationId: formString(formData, "applicationId"),
    regenerate: formString(formData, "regenerate"),
  });

  if (!parsed.success) return validationError(parsed.error);

  try {
    const supabase = await createClient();
    const application = await loadOwnedJobDescription(
      supabase,
      userId,
      parsed.data.applicationId,
    );
    const result = await extractJobDescription(
      { supabase, userId },
      {
        jobDescription: application.raw_job_description,
        applicationId: application.id,
        regenerate: parsed.data.regenerate,
      },
    );

    revalidatePath(`/applications/${application.id}`);
    return successState(result, {
      kind: "job-extraction",
      data: result.data,
    });
  } catch (error) {
    return actionError(error);
  }
}

export async function compareApplicationResumeAction(
  _previousState: AIActionState,
  formData: FormData,
): Promise<AIActionState> {
  const { userId } = await requireVerifiedIdentity("/applications");
  const parsed = existingApplicationSchema.safeParse({
    applicationId: formString(formData, "applicationId"),
    regenerate: formString(formData, "regenerate"),
  });

  if (!parsed.success) return validationError(parsed.error);

  try {
    const supabase = await createClient();
    const { application, resumeText } = await loadOwnedApplicationAndResume(
      supabase,
      userId,
      parsed.data.applicationId,
    );
    const result = await compareResumeToJob(
      { supabase, userId },
      {
        applicationId: application.id,
        jobDescription: application.raw_job_description,
        resumeText,
        regenerate: parsed.data.regenerate,
      },
    );

    revalidatePath(`/applications/${application.id}`);
    return successState(result, {
      kind: "resume-comparison",
      data: result.data,
    });
  } catch (error) {
    return actionError(error);
  }
}

export async function prepareApplicationInterviewAction(
  _previousState: AIActionState,
  formData: FormData,
): Promise<AIActionState> {
  const { userId } = await requireVerifiedIdentity("/applications");
  const parsed = interviewPrepActionSchema.safeParse({
    applicationId: formString(formData, "applicationId"),
    regenerate: formString(formData, "regenerate"),
    mode: formString(formData, "mode") || "jd",
  });

  if (!parsed.success) return validationError(parsed.error);

  try {
    const supabase = await createClient();
    let jobDescription: string;
    let resumeText: string | null = null;

    if (parsed.data.mode === "jd-resume") {
      const loaded = await loadOwnedApplicationAndResume(
        supabase,
        userId,
        parsed.data.applicationId,
      );
      jobDescription = loaded.application.raw_job_description;
      resumeText = loaded.resumeText;
    } else {
      const application = await loadOwnedJobDescription(
        supabase,
        userId,
        parsed.data.applicationId,
      );
      jobDescription = application.raw_job_description;
    }

    const result = await prepareForInterview(
      { supabase, userId },
      {
        applicationId: parsed.data.applicationId,
        jobDescription,
        resumeText,
        regenerate: parsed.data.regenerate,
      },
    );

    revalidatePath(`/applications/${parsed.data.applicationId}`);
    return successState(result, {
      kind: "interview-prep",
      data: result.data,
    });
  } catch (error) {
    return actionError(error);
  }
}
