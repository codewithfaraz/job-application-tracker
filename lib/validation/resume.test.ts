import { describe, expect, it } from "vitest";

import { resumeMetadataSchema, safeResumeFilename } from "./resume";

describe("resume validation", () => {
  it("creates a path-safe filename while preserving supported extensions", () => {
    expect(safeResumeFilename("Faraz Résumé (Backend).PDF")).toBe(
      "Faraz-Resume-Backend.pdf",
    );
  });

  it("rejects a MIME and extension mismatch", () => {
    const result = resumeMetadataSchema.safeParse({
      id: "00000000-0000-4000-8000-000000000000",
      name: "Backend",
      originalFilename: "resume.txt",
      storagePath:
        "00000000-0000-4000-8000-000000000000/00000000-0000-4000-8000-000000000000/resume.txt",
      mimeType: "application/pdf",
      fileSizeBytes: 100,
      fileHash: "a".repeat(64),
    });

    expect(result.success).toBe(false);
  });
});
