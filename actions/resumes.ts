"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ResumeActionState } from "@/lib/action-states";
import {
  extractResumeText,
  isResumeTextExtractionError,
  normalizeResumeText,
  validateResumeFileBytes,
} from "@/lib/resumes/extract-text.server";
import { requireVerifiedIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  allowedResumeMimeTypes,
  MAX_RESUME_BYTES,
  RESUME_BUCKET,
  resumeMetadataSchema,
} from "@/lib/validation/resume";

const resumeIdSchema = z.string().uuid();

const resumeUploadReservationSchema = z.object({
  id: z.string().uuid(),
  storagePath: z.string().trim().min(1).max(1_024),
  mimeType: z.enum(allowedResumeMimeTypes),
  fileSizeBytes: z.coerce.number().int().positive().max(MAX_RESUME_BYTES),
});

const resumeUploadCancellationSchema = resumeUploadReservationSchema.pick({
  id: true,
  storagePath: true,
});

function isStorageNotFound(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { status?: unknown; statusCode?: unknown };
  return candidate.status === 404 || candidate.statusCode === "404";
}

export async function reserveResumeUploadAction(
  _previousState: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const parsed = resumeUploadReservationSchema.safeParse({
    id: formData.get("id"),
    storagePath: formData.get("storagePath"),
    mimeType: formData.get("mimeType"),
    fileSizeBytes: formData.get("fileSizeBytes"),
  });

  if (!parsed.success) {
    return { status: "error", message: "The upload reservation is invalid." };
  }

  const { userId } = await requireVerifiedIdentity("/resumes");
  const expectedPrefix = `${userId}/${parsed.data.id}/`;
  if (
    !parsed.data.storagePath.startsWith(expectedPrefix) ||
    parsed.data.storagePath.includes("..")
  ) {
    return { status: "error", message: "The upload path is invalid." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("reserve_resume_upload", {
    p_resume_id: parsed.data.id,
    p_storage_path: parsed.data.storagePath,
    p_expected_bytes: parsed.data.fileSizeBytes,
    p_mime_type: parsed.data.mimeType,
  });

  if (error) {
    if (error.message.includes("RESUME_OBJECT_QUOTA")) {
      return {
        status: "error",
        message: "Your resume library has reached its 50-file limit.",
      };
    }
    if (error.message.includes("RESUME_BYTES_QUOTA")) {
      return {
        status: "error",
        message: "Your resume library has reached its 250 MB storage limit.",
      };
    }

    return {
      status: "error",
      message: "The upload could not be reserved. Please try again.",
    };
  }

  return { status: "success" };
}

export async function finalizeResumeUploadAction(
  _previousState: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const parsed = resumeMetadataSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    originalFilename: formData.get("originalFilename"),
    storagePath: formData.get("storagePath"),
    mimeType: formData.get("mimeType"),
    fileSizeBytes: formData.get("fileSizeBytes"),
    fileHash: formData.get("fileHash"),
    extractedText: formData.get("extractedText") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the resume details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { userId } = await requireVerifiedIdentity("/resumes");
  const expectedPrefix = `${userId}/${parsed.data.id}/`;
  if (
    !parsed.data.storagePath.startsWith(expectedPrefix) ||
    parsed.data.storagePath.includes("..")
  ) {
    return { status: "error", message: "The upload path is invalid." };
  }

  const supabase = await createClient();
  const { data: object, error: objectError } = await supabase.storage
    .from(RESUME_BUCKET)
    .info(parsed.data.storagePath);

  if (
    objectError ||
    !object ||
    object.size !== parsed.data.fileSizeBytes ||
    object.contentType !== parsed.data.mimeType
  ) {
    return {
      status: "error",
      message: "The uploaded file could not be verified. Please upload it again.",
    };
  }

  const { data: storedFile, error: downloadError } = await supabase.storage
    .from(RESUME_BUCKET)
    .download(parsed.data.storagePath);

  if (downloadError || !storedFile) {
    return {
      status: "error",
      message: "The uploaded file could not be read. Please upload it again.",
    };
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await storedFile.arrayBuffer());
  } catch {
    return {
      status: "error",
      message: "The uploaded file could not be read. Please upload it again.",
    };
  }

  if (
    bytes.byteLength > MAX_RESUME_BYTES ||
    bytes.byteLength !== parsed.data.fileSizeBytes
  ) {
    return {
      status: "error",
      message: "The uploaded file size could not be verified. Please upload it again.",
    };
  }

  const serverFileHash = createHash("sha256").update(bytes).digest("hex");
  if (serverFileHash !== parsed.data.fileHash) {
    return {
      status: "error",
      message: "The uploaded file failed its integrity check. Please upload it again.",
    };
  }

  let extractedText: string;
  try {
    validateResumeFileBytes({ bytes, mimeType: parsed.data.mimeType });

    const manualText = parsed.data.extractedText?.trim();
    extractedText = manualText
      ? normalizeResumeText(manualText)
      : await extractResumeText({
          bytes,
          mimeType: parsed.data.mimeType,
        });
  } catch (error) {
    return {
      status: "error",
      message: isResumeTextExtractionError(error)
        ? error.safeMessage
        : "We could not read this resume file. Paste the resume text or choose another file and try again.",
    };
  }

  const { error } = await supabase.rpc("finalize_resume_upload", {
    p_resume_id: parsed.data.id,
    p_name: parsed.data.name,
    p_original_filename: parsed.data.originalFilename,
    p_storage_path: parsed.data.storagePath,
    p_mime_type: parsed.data.mimeType,
    p_file_size_bytes: bytes.byteLength,
    p_file_hash: serverFileHash,
    p_extracted_text: extractedText,
  });

  if (error) {
    return {
      status: "error",
      message: "The file uploaded, but its record could not be saved.",
    };
  }

  revalidatePath("/resumes");
  revalidatePath("/applications/new");
  return { status: "success", message: "Resume uploaded." };
}

export async function cancelResumeUploadAction(
  _previousState: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const parsed = resumeUploadCancellationSchema.safeParse({
    id: formData.get("id"),
    storagePath: formData.get("storagePath"),
  });
  if (!parsed.success) {
    return { status: "error", message: "The upload cleanup is invalid." };
  }

  const { userId } = await requireVerifiedIdentity("/resumes");
  const expectedPrefix = `${userId}/${parsed.data.id}/`;
  if (
    !parsed.data.storagePath.startsWith(expectedPrefix) ||
    parsed.data.storagePath.includes("..")
  ) {
    return { status: "error", message: "The upload path is invalid." };
  }

  const supabase = await createClient();
  const { data: object, error: objectError } = await supabase.storage
    .from(RESUME_BUCKET)
    .info(parsed.data.storagePath);

  // Cancellation releases durable quota. Fail closed unless Storage itself
  // confirms that no object exists after the caller's removal attempt.
  if (object || !objectError || !isStorageNotFound(objectError)) {
    return {
      status: "error",
      message: "The uploaded object still exists, so its quota remains reserved.",
    };
  }

  const { data: released, error } = await supabase.rpc("cancel_resume_upload", {
    p_resume_id: parsed.data.id,
    p_storage_path: parsed.data.storagePath,
  });

  if (error) {
    return { status: "error", message: "The upload cleanup could not be queued." };
  }

  return {
    status: "success",
    message: released
      ? "The abandoned upload allocation was released."
      : "Upload cleanup is queued; its quota stays reserved for at least 24 hours and is released on a later cleanup check.",
  };
}

async function setResumeArchived(
  resumeId: string,
  archived: boolean,
): Promise<ResumeActionState> {
  const parsedId = resumeIdSchema.safeParse(resumeId);
  if (!parsedId.success) return { status: "error", message: "Invalid resume." };

  const { userId } = await requireVerifiedIdentity("/resumes");
  const supabase = await createClient();
  const { error } = await supabase
    .from("resumes")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", parsedId.data)
    .eq("user_id", userId);

  if (error) {
    return { status: "error", message: "The resume could not be updated." };
  }

  revalidatePath("/resumes");
  revalidatePath("/applications/new");
  return {
    status: "success",
    message: archived ? "Resume archived." : "Resume restored.",
  };
}

export async function archiveResumeAction(
  _previousState: ResumeActionState,
  formData: FormData,
) {
  return setResumeArchived(String(formData.get("resumeId") ?? ""), true);
}

export async function restoreResumeAction(
  _previousState: ResumeActionState,
  formData: FormData,
) {
  return setResumeArchived(String(formData.get("resumeId") ?? ""), false);
}

export async function deleteResumeAction(
  _previousState: ResumeActionState,
  formData: FormData,
): Promise<ResumeActionState> {
  const parsedId = resumeIdSchema.safeParse(formData.get("resumeId"));
  const confirmed = formData.get("confirmation") === "DELETE";
  if (!parsedId.success || !confirmed) {
    return {
      status: "error",
      message: "Type DELETE to permanently remove this resume.",
    };
  }

  const { userId } = await requireVerifiedIdentity("/resumes");
  const supabase = await createClient();
  const { data: resume, error: lookupError } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", parsedId.data)
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError || !resume) {
    return { status: "error", message: "Resume not found." };
  }

  const { count, error: referenceError } = await supabase
    .from("applications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("submitted_resume_id", resume.id);

  if (referenceError || (count ?? 0) > 0) {
    return {
      status: "error",
      message: "This resume is attached to an application. Archive it instead.",
    };
  }

  const { error: deleteError } = await supabase
    .from("resumes")
    .delete()
    .eq("id", resume.id)
    .eq("user_id", userId);

  if (deleteError) {
    return { status: "error", message: "The resume could not be removed." };
  }

  const { error: storageError } = await supabase.storage
    .from(RESUME_BUCKET)
    .remove([resume.storage_path]);

  if (storageError) {
    const { error: restoreError } = await supabase.rpc(
      "restore_resume_metadata_after_failed_delete",
      {
        p_resume_id: resume.id,
        p_name: resume.name,
        p_original_filename: resume.original_filename,
        p_storage_path: resume.storage_path,
        p_mime_type: resume.mime_type,
        p_file_size_bytes: resume.file_size_bytes,
        p_file_hash: resume.file_hash,
        p_extracted_text: resume.extracted_text,
        p_archived_at: resume.archived_at,
        p_created_at: resume.created_at,
        p_updated_at: resume.updated_at,
      },
    );
    return {
      status: "error",
      message: restoreError
        ? "The file removal could not be confirmed. Refresh before trying again."
        : "The file could not be removed, so the resume was restored.",
    };
  }

  revalidatePath("/resumes");
  revalidatePath("/applications/new");
  return { status: "success", message: "Resume permanently deleted." };
}
