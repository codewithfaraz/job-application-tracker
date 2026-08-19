import { z } from "zod";

export const RESUME_BUCKET = "resumes";
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export const allowedResumeMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

export const resumeMetadataSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().trim().min(1, "Give this resume a name.").max(100),
    originalFilename: z.string().trim().min(1).max(255),
    storagePath: z.string().trim().min(1).max(1_024),
    mimeType: z.enum(allowedResumeMimeTypes),
    fileSizeBytes: z.coerce.number().int().positive().max(MAX_RESUME_BYTES),
    fileHash: z.string().regex(/^[a-f0-9]{64}$/),
    extractedText: z.string().max(100_000).optional(),
  })
  .superRefine((value, context) => {
    const expectedExtensions: Record<(typeof allowedResumeMimeTypes)[number], string> = {
      "application/pdf": ".pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        ".docx",
      "text/plain": ".txt",
    };

    if (!value.originalFilename.toLowerCase().endsWith(expectedExtensions[value.mimeType])) {
      context.addIssue({
        code: "custom",
        path: ["originalFilename"],
        message: "The file extension does not match its file type.",
      });
    }
  });

export function safeResumeFilename(filename: string): string {
  const extension = filename.toLowerCase().match(/\.(pdf|docx|txt)$/)?.[0] ?? "";
  const base = filename
    .slice(0, extension ? -extension.length : undefined)
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return `${base || "resume"}${extension}`;
}
