import "server-only";

import { requireVerifiedIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export type ResumeListItem = {
  id: string;
  name: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  hasExtractedText: boolean;
  createdAt: string;
  archivedAt: string | null;
  applicationCount: number;
};

export async function getResumesPageData(): Promise<{
  userId: string;
  resumes: ResumeListItem[];
}> {
  const { userId } = await requireVerifiedIdentity("/resumes");
  const supabase = await createClient();

  const [resumeResult, applicationResult] = await Promise.all([
    supabase
      .from("resumes")
      .select(
        "id, name, original_filename, mime_type, file_size_bytes, extracted_text, created_at, archived_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("applications")
      .select("submitted_resume_id")
      .eq("user_id", userId)
      .not("submitted_resume_id", "is", null),
  ]);

  if (resumeResult.error || applicationResult.error) {
    throw new Error("Could not load your resumes.");
  }

  const usage = new Map<string, number>();
  for (const application of applicationResult.data) {
    if (!application.submitted_resume_id) continue;
    usage.set(
      application.submitted_resume_id,
      (usage.get(application.submitted_resume_id) ?? 0) + 1,
    );
  }

  return {
    userId,
    resumes: resumeResult.data.map((resume) => ({
      id: resume.id,
      name: resume.name,
      originalFilename: resume.original_filename,
      mimeType: resume.mime_type,
      fileSizeBytes: resume.file_size_bytes,
      hasExtractedText: Boolean(resume.extracted_text?.trim()),
      createdAt: resume.created_at,
      archivedAt: resume.archived_at,
      applicationCount: usage.get(resume.id) ?? 0,
    })),
  };
}
