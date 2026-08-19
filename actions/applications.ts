"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  escapeLikePattern,
  normalizeCompanyKey,
  normalizeJobTitleKey,
} from "@/lib/data/application-helpers";
import { requireVerifiedIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  applicationFieldErrors,
  applicationIdSchema,
  createApplicationSchema,
  deleteApplicationSchema,
  type ApplicationActionState,
  type CreateApplicationInput,
  type UpdateApplicationInput,
  updateApplicationSchema,
} from "@/lib/validation/application";
import type { Enums, Tables, TablesInsert, TablesUpdate } from "@/types/database";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type ApplicationRow = Tables<"applications">;

type DatabaseFailure = {
  code?: string;
  message?: string;
};

class ApplicationMutationError extends Error {
  code?: string;

  constructor(error: DatabaseFailure, fallback: string) {
    super(error.message || fallback);
    this.name = "ApplicationMutationError";
    this.code = error.code;
  }
}

type VerifiedReferences = {
  stage: {
    id: string;
    category: Enums<"pipeline_stage_category">;
  };
};

const applicationFormFields = [
  "companyName",
  "jobTitle",
  "jobUrl",
  "sourceId",
  "channelId",
  "stageId",
  "location",
  "workMode",
  "employmentType",
  "seniority",
  "salaryMin",
  "salaryMax",
  "salaryCurrency",
  "salaryPeriod",
  "appliedAt",
  "resumeId",
  "rawJobDescription",
  "notes",
] as const;

function formString(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value : "";
}

function applicationFormValues(formData: FormData) {
  return Object.fromEntries(
    applicationFormFields.map((field) => [field, formString(formData, field)]),
  );
}

function errorState(
  message: string,
  fieldErrors?: Record<string, string[]>,
): ApplicationActionState {
  return {
    status: "error",
    message,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
}

function duplicateState(id: string): ApplicationActionState {
  return {
    status: "duplicate",
    duplicateId: id,
    message:
      "A similar application already exists. Review it, or choose Save anyway.",
  };
}

function databaseErrorState(error: unknown): ApplicationActionState {
  if (!(error instanceof ApplicationMutationError)) {
    return errorState("The application could not be saved. Try again.");
  }

  const message = error.message.toLowerCase();

  if (message.includes("reassign or remove application contacts")) {
    return errorState(
      "Move or remove this application's contacts before changing its company.",
      { companyName: ["This company cannot change while contacts are attached."] },
    );
  }

  if (
    error.code === "22007" ||
    message.includes("application date") ||
    message.includes("history event")
  ) {
    return errorState("Check the application date and stage history.", {
      appliedAt: ["Use a valid date that fits the recorded stage history."],
    });
  }

  if (message.includes("move the record to applied")) {
    return errorState("Move this application to Applied before advancing it.", {
      stageId: ["This stage requires an Applied event first."],
    });
  }

  if (error.code === "23503" || message.includes("does not belong")) {
    return errorState("One of the selected options is no longer available.");
  }

  if (error.code === "23514") {
    return errorState("The application conflicts with its current stage history.");
  }

  if (error.code === "42501") {
    return errorState("Your session could not be verified. Sign in again.");
  }

  return errorState("The application could not be saved. Try again.");
}

function throwOnDatabaseError(
  error: DatabaseFailure | null,
  fallback: string,
): asserts error is null {
  if (error) throw new ApplicationMutationError(error, fallback);
}

function nullableTrimmed(value: string) {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

async function verifyReferences(
  supabase: SupabaseClient,
  userId: string,
  input: Pick<
    CreateApplicationInput,
    "sourceId" | "channelId" | "stageId" | "resumeId"
  >,
  current?: Pick<
    ApplicationRow,
    | "discovery_source_id"
    | "application_channel_id"
    | "current_stage_id"
    | "submitted_resume_id"
  >,
): Promise<
  | { references: VerifiedReferences; fieldErrors?: never }
  | { references?: never; fieldErrors: Record<string, string[]> }
> {
  const [sourceResult, channelResult, stageResult, resumeResult] =
    await Promise.all([
      supabase
        .from("application_sources")
        .select("id,is_active")
        .eq("id", input.sourceId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("application_channels")
        .select("id,is_active")
        .eq("id", input.channelId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("pipeline_stages")
        .select("id,category,is_active")
        .eq("id", input.stageId)
        .eq("user_id", userId)
        .maybeSingle(),
      input.resumeId
        ? supabase
            .from("resumes")
            .select("id,archived_at")
            .eq("id", input.resumeId)
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({
            data: null as { id: string; archived_at: string | null } | null,
            error: null,
          }),
    ]);

  throwOnDatabaseError(sourceResult.error, "Source validation failed.");
  throwOnDatabaseError(channelResult.error, "Channel validation failed.");
  throwOnDatabaseError(stageResult.error, "Stage validation failed.");
  throwOnDatabaseError(resumeResult.error, "Resume validation failed.");

  const fieldErrors: Record<string, string[]> = {};
  const sourceCanRemainInactive =
    current?.discovery_source_id === input.sourceId;
  const channelCanRemainInactive =
    current?.application_channel_id === input.channelId;
  const stageCanRemainInactive = current?.current_stage_id === input.stageId;
  const resumeCanRemainArchived =
    current?.submitted_resume_id === input.resumeId;

  if (
    !sourceResult.data ||
    (!sourceResult.data.is_active && !sourceCanRemainInactive)
  ) {
    fieldErrors.sourceId = ["Choose an active discovery source."];
  }
  if (
    !channelResult.data ||
    (!channelResult.data.is_active && !channelCanRemainInactive)
  ) {
    fieldErrors.channelId = ["Choose an active application channel."];
  }
  if (
    !stageResult.data ||
    (!stageResult.data.is_active && !stageCanRemainInactive)
  ) {
    fieldErrors.stageId = ["Choose an active pipeline stage."];
  }
  if (
    input.resumeId &&
    (!resumeResult.data ||
      (resumeResult.data.archived_at !== null && !resumeCanRemainArchived))
  ) {
    fieldErrors.resumeId = ["Choose an available resume."];
  }

  if (Object.keys(fieldErrors).length > 0 || !stageResult.data) {
    return { fieldErrors };
  }

  return {
    references: {
      stage: {
        id: stageResult.data.id,
        category: stageResult.data.category,
      },
    },
  };
}

async function findExistingCompany(
  supabase: SupabaseClient,
  userId: string,
  companyName: string,
) {
  const pattern = `%${escapeLikePattern(companyName.trim())}%`;
  const result = await supabase
    .from("companies")
    .select("id,name")
    .eq("user_id", userId)
    .ilike("name", pattern);

  throwOnDatabaseError(result.error, "Company lookup failed.");

  const key = normalizeCompanyKey(companyName);
  return (result.data ?? []).find(
    (company) => normalizeCompanyKey(company.name) === key,
  );
}

async function ensureCompany(
  supabase: SupabaseClient,
  userId: string,
  companyName: string,
) {
  const existing = await findExistingCompany(supabase, userId, companyName);
  if (existing) return existing;

  const inserted = await supabase
    .from("companies")
    .insert({ user_id: userId, name: companyName })
    .select("id,name")
    .single();

  if (!inserted.error && inserted.data) return inserted.data;

  if (inserted.error?.code === "23505") {
    const racedCompany = await findExistingCompany(
      supabase,
      userId,
      companyName,
    );
    if (racedCompany) return racedCompany;
  }

  throw new ApplicationMutationError(
    inserted.error ?? {},
    "Company could not be created.",
  );
}

async function findDuplicateApplication(
  supabase: SupabaseClient,
  userId: string,
  companyId: string,
  jobTitle: string,
) {
  const result = await supabase
    .from("applications")
    .select("id,job_title")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  throwOnDatabaseError(result.error, "Duplicate check failed.");

  const titleKey = normalizeJobTitleKey(jobTitle);
  return (result.data ?? []).find(
    (application) => normalizeJobTitleKey(application.job_title) === titleKey,
  );
}

function createInsertPayload(
  userId: string,
  companyId: string,
  input: CreateApplicationInput,
): TablesInsert<"applications"> {
  return {
    user_id: userId,
    company_id: companyId,
    job_title: input.jobTitle,
    job_url: input.jobUrl,
    discovery_source_id: input.sourceId,
    application_channel_id: input.channelId,
    location: input.location,
    work_mode: input.workMode,
    employment_type: input.employmentType,
    seniority: input.seniority,
    salary_min: input.salaryMin,
    salary_max: input.salaryMax,
    salary_currency: input.salaryCurrency,
    salary_period: input.salaryPeriod,
    applied_at: input.appliedAt,
    current_stage_id: input.stageId,
    submitted_resume_id: input.resumeId,
    raw_job_description: input.rawJobDescription,
    notes: nullableTrimmed(input.notes),
  };
}

function createUpdatePayload(
  companyId: string,
  appliedAt: string | null,
  input: UpdateApplicationInput,
): TablesUpdate<"applications"> {
  return {
    company_id: companyId,
    job_title: input.jobTitle,
    job_url: input.jobUrl,
    discovery_source_id: input.sourceId,
    application_channel_id: input.channelId,
    location: input.location,
    work_mode: input.workMode,
    employment_type: input.employmentType,
    seniority: input.seniority,
    salary_min: input.salaryMin,
    salary_max: input.salaryMax,
    salary_currency: input.salaryCurrency,
    salary_period: input.salaryPeriod,
    applied_at: appliedAt,
    current_stage_id: input.stageId,
    submitted_resume_id: input.resumeId,
    raw_job_description: input.rawJobDescription,
    notes: nullableTrimmed(input.notes),
  };
}

function revalidateApplicationViews(id?: string) {
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");

  if (id) {
    revalidatePath(`/applications/${id}`);
    revalidatePath(`/applications/${id}/edit`);
  }
}

export async function createApplicationAction(
  _previousState: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const { userId } = await requireVerifiedIdentity("/applications/new");
  const parsed = createApplicationSchema.safeParse({
    ...applicationFormValues(formData),
    confirmDuplicate: formString(formData, "confirmDuplicate"),
  });

  if (!parsed.success) {
    return errorState(
      "Check the highlighted fields.",
      applicationFieldErrors(parsed.error),
    );
  }

  let createdId: string;

  try {
    const supabase = await createClient();
    const verification = await verifyReferences(
      supabase,
      userId,
      parsed.data,
    );

    if (verification.fieldErrors) {
      return errorState("One or more selections are unavailable.", verification.fieldErrors);
    }

    if (
      verification.references.stage.category !== "saved" &&
      verification.references.stage.category !== "applied"
    ) {
      return errorState("New applications must start as Saved or Applied.", {
        stageId: ["Choose a Saved or Applied stage."],
      });
    }

    if (
      verification.references.stage.category === "applied" &&
      !parsed.data.appliedAt
    ) {
      return errorState("Add the date you applied.", {
        appliedAt: ["Application date is required for an Applied record."],
      });
    }

    if (
      verification.references.stage.category === "saved" &&
      parsed.data.appliedAt
    ) {
      return errorState("Saved roles do not have an application date yet.", {
        appliedAt: ["Clear the date, or choose an Applied stage."],
      });
    }

    const existingCompany = await findExistingCompany(
      supabase,
      userId,
      parsed.data.companyName,
    );

    if (existingCompany && !parsed.data.confirmDuplicate) {
      const duplicate = await findDuplicateApplication(
        supabase,
        userId,
        existingCompany.id,
        parsed.data.jobTitle,
      );

      if (duplicate) return duplicateState(duplicate.id);
    }

    const company =
      existingCompany ??
      (await ensureCompany(supabase, userId, parsed.data.companyName));
    const applicationResult = await supabase
      .from("applications")
      .insert(createInsertPayload(userId, company.id, parsed.data))
      .select("id")
      .single();

    throwOnDatabaseError(
      applicationResult.error,
      "Application could not be created.",
    );

    if (!applicationResult.data) {
      throw new ApplicationMutationError({}, "Application could not be created.");
    }

    createdId = applicationResult.data.id;
  } catch (error) {
    return databaseErrorState(error);
  }

  revalidateApplicationViews(createdId);
  redirect(`/applications/${createdId}`);
}

export async function updateApplicationAction(
  _previousState: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const { userId } = await requireVerifiedIdentity("/applications");
  const parsed = updateApplicationSchema.safeParse({
    id: formString(formData, "id"),
    ...applicationFormValues(formData),
  });

  if (!parsed.success) {
    return errorState(
      "Check the highlighted fields.",
      applicationFieldErrors(parsed.error),
    );
  }

  try {
    const supabase = await createClient();
    const currentResult = await supabase
      .from("applications")
      .select("*")
      .eq("id", parsed.data.id)
      .eq("user_id", userId)
      .maybeSingle();

    throwOnDatabaseError(currentResult.error, "Application lookup failed.");
    if (!currentResult.data) {
      return errorState("Application not found.");
    }

    const verification = await verifyReferences(
      supabase,
      userId,
      parsed.data,
      currentResult.data,
    );

    if (verification.fieldErrors) {
      return errorState("One or more selections are unavailable.", verification.fieldErrors);
    }

    const effectiveAppliedAt =
      parsed.data.appliedAt ?? currentResult.data.applied_at;

    if (
      !currentResult.data.applied_at &&
      verification.references.stage.category === "applied" &&
      !effectiveAppliedAt
    ) {
      return errorState("Add the date you applied.", {
        appliedAt: ["Application date is required when moving to Applied."],
      });
    }

    if (
      !currentResult.data.applied_at &&
      verification.references.stage.category !== "applied" &&
      effectiveAppliedAt
    ) {
      return errorState("Move the application to Applied before adding a date.", {
        appliedAt: ["A never-applied record cannot have an application date."],
      });
    }

    const existingCompany = await findExistingCompany(
      supabase,
      userId,
      parsed.data.companyName,
    );
    const targetCompanyId = existingCompany?.id;

    if (
      targetCompanyId !== currentResult.data.company_id &&
      normalizeCompanyKey(parsed.data.companyName) !== ""
    ) {
      const contactsResult = await supabase
        .from("contacts")
        .select("id")
        .eq("application_id", parsed.data.id)
        .eq("user_id", userId)
        .limit(1);

      throwOnDatabaseError(contactsResult.error, "Contact lookup failed.");
      if ((contactsResult.data?.length ?? 0) > 0) {
        return errorState(
          "Move or remove this application's contacts before changing its company.",
          {
            companyName: [
              "This company cannot change while contacts are attached.",
            ],
          },
        );
      }
    }

    const company =
      existingCompany ??
      (await ensureCompany(supabase, userId, parsed.data.companyName));
    const updateResult = await supabase
      .from("applications")
      .update(createUpdatePayload(company.id, effectiveAppliedAt, parsed.data))
      .eq("id", parsed.data.id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    throwOnDatabaseError(updateResult.error, "Application could not be updated.");
    if (!updateResult.data) return errorState("Application not found.");
  } catch (error) {
    return databaseErrorState(error);
  }

  revalidateApplicationViews(parsed.data.id);
  redirect(`/applications/${parsed.data.id}`);
}

export async function archiveApplicationAction(
  _previousState: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const { userId } = await requireVerifiedIdentity("/applications");
  const parsed = applicationIdSchema.safeParse({
    id: formString(formData, "id"),
  });

  if (!parsed.success) {
    return errorState(
      "Application identifier is invalid.",
      applicationFieldErrors(parsed.error),
    );
  }

  try {
    const supabase = await createClient();
    const result = await supabase
      .from("applications")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", parsed.data.id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    throwOnDatabaseError(result.error, "Application could not be archived.");
    if (!result.data) return errorState("Application not found.");
  } catch (error) {
    return databaseErrorState(error);
  }

  revalidateApplicationViews(parsed.data.id);
  redirect("/applications");
}

export async function restoreApplicationAction(
  _previousState: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const { userId } = await requireVerifiedIdentity("/applications");
  const parsed = applicationIdSchema.safeParse({
    id: formString(formData, "id"),
  });

  if (!parsed.success) {
    return errorState(
      "Application identifier is invalid.",
      applicationFieldErrors(parsed.error),
    );
  }

  try {
    const supabase = await createClient();
    const result = await supabase
      .from("applications")
      .update({ archived_at: null })
      .eq("id", parsed.data.id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    throwOnDatabaseError(result.error, "Application could not be restored.");
    if (!result.data) return errorState("Application not found.");
  } catch (error) {
    return databaseErrorState(error);
  }

  revalidateApplicationViews(parsed.data.id);
  redirect(`/applications/${parsed.data.id}`);
}

export async function deleteApplicationAction(
  _previousState: ApplicationActionState,
  formData: FormData,
): Promise<ApplicationActionState> {
  const { userId } = await requireVerifiedIdentity("/applications");
  const parsed = deleteApplicationSchema.safeParse({
    id: formString(formData, "id"),
    confirmDelete: formString(formData, "confirmDelete"),
  });

  if (!parsed.success) {
    return errorState(
      "Application identifier is invalid.",
      applicationFieldErrors(parsed.error),
    );
  }

  if (!parsed.data.confirmDelete) {
    return errorState("Confirm permanent deletion before continuing.", {
      confirmDelete: ["Confirmation is required."],
    });
  }

  try {
    const supabase = await createClient();
    const result = await supabase
      .from("applications")
      .delete()
      .eq("id", parsed.data.id)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    throwOnDatabaseError(result.error, "Application could not be deleted.");
    if (!result.data) return errorState("Application not found.");
  } catch (error) {
    return databaseErrorState(error);
  }

  revalidateApplicationViews(parsed.data.id);
  redirect("/applications");
}
