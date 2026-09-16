// @vitest-environment node

import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  extractResumeText: vi.fn(),
  requireVerifiedIdentity: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/supabase/auth", () => ({
  requireVerifiedIdentity: mocks.requireVerifiedIdentity,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));
vi.mock("@/lib/resumes/extract-text.server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/resumes/extract-text.server")>();
  return { ...actual, extractResumeText: mocks.extractResumeText };
});

import { finalizeResumeUploadAction } from "./resumes";
import { initialResumeActionState } from "@/lib/action-states";
import { ResumeTextExtractionError } from "@/lib/resumes/extract-text.server";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const RESUME_ID = "22222222-2222-4222-8222-222222222222";
const MIME_TYPE = "text/plain";
const STORAGE_PATH = `${USER_ID}/${RESUME_ID}/resume.txt`;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function createMetadata(
  bytes: Uint8Array,
  overrides: Partial<{
    extractedText: string;
    fileHash: string;
    fileSizeBytes: number;
  }> = {},
): FormData {
  const formData = new FormData();
  formData.set("id", RESUME_ID);
  formData.set("name", "Backend resume");
  formData.set("originalFilename", "resume.txt");
  formData.set("storagePath", STORAGE_PATH);
  formData.set("mimeType", MIME_TYPE);
  formData.set(
    "fileSizeBytes",
    String(overrides.fileSizeBytes ?? bytes.byteLength),
  );
  formData.set("fileHash", overrides.fileHash ?? sha256(bytes));
  if (overrides.extractedText !== undefined) {
    formData.set("extractedText", overrides.extractedText);
  }
  return formData;
}

function prepareSupabase(
  downloadedBytes: Uint8Array,
  options: Partial<{
    contentType: string;
    downloadError: { message: string };
    infoSize: number;
    rpcError: { message: string };
  }> = {},
) {
  const storage = {
    info: vi.fn().mockResolvedValue({
      data: {
        size: options.infoSize ?? downloadedBytes.byteLength,
        contentType: options.contentType ?? MIME_TYPE,
      },
      error: null,
    }),
    download: vi.fn().mockResolvedValue(
      options.downloadError
        ? { data: null, error: options.downloadError }
        : {
            data: new Blob([Uint8Array.from(downloadedBytes)], {
              type: MIME_TYPE,
            }),
            error: null,
          },
    ),
  };
  const rpc = vi.fn().mockResolvedValue({
    data: null,
    error: options.rpcError ?? null,
  });
  const supabase = {
    storage: { from: vi.fn().mockReturnValue(storage) },
    rpc,
  };

  mocks.createClient.mockResolvedValue(supabase);
  return { rpc, storage, supabase };
}

describe("finalizeResumeUploadAction extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireVerifiedIdentity.mockResolvedValue({ userId: USER_ID });
    mocks.extractResumeText.mockResolvedValue("Automatically extracted text");
  });

  it("uses normalized manual text without invoking file extraction", async () => {
    const bytes = new Uint8Array(Buffer.from("original TXT file", "utf8"));
    const { rpc, storage } = prepareSupabase(bytes);

    const result = await finalizeResumeUploadAction(
      initialResumeActionState,
      createMetadata(bytes, {
        extractedText: "  Résumé\r\nBackend Engineer\u0007  ",
      }),
    );

    expect(result).toMatchObject({ status: "success" });
    expect(storage.download).toHaveBeenCalledWith(STORAGE_PATH);
    expect(mocks.extractResumeText).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith(
      "finalize_resume_upload",
      expect.objectContaining({
        p_file_hash: sha256(bytes),
        p_file_size_bytes: bytes.byteLength,
        p_extracted_text: "Résumé\nBackend Engineer",
      }),
    );
  });

  it("automatically extracts text when the manual field is blank", async () => {
    const bytes = new Uint8Array(Buffer.from("original TXT file", "utf8"));
    const { rpc } = prepareSupabase(bytes);

    const result = await finalizeResumeUploadAction(
      initialResumeActionState,
      createMetadata(bytes, { extractedText: "  \r\n  " }),
    );

    expect(result).toMatchObject({ status: "success" });
    expect(mocks.extractResumeText).toHaveBeenCalledWith({
      bytes: expect.any(Uint8Array),
      mimeType: MIME_TYPE,
    });
    expect(rpc).toHaveBeenCalledWith(
      "finalize_resume_upload",
      expect.objectContaining({
        p_extracted_text: "Automatically extracted text",
      }),
    );
  });

  it("rejects a client hash that does not match the downloaded bytes", async () => {
    const bytes = new Uint8Array(Buffer.from("original TXT file", "utf8"));
    const { rpc } = prepareSupabase(bytes);

    const result = await finalizeResumeUploadAction(
      initialResumeActionState,
      createMetadata(bytes, { fileHash: "a".repeat(64) }),
    );

    expect(result).toEqual({
      status: "error",
      message:
        "The uploaded file failed its integrity check. Please upload it again.",
    });
    expect(mocks.extractResumeText).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects downloaded bytes whose length differs from verified metadata", async () => {
    const submittedBytes = new Uint8Array(Buffer.from("expected", "utf8"));
    const downloadedBytes = new Uint8Array(
      Buffer.from("different-length", "utf8"),
    );
    const { rpc } = prepareSupabase(downloadedBytes, {
      infoSize: submittedBytes.byteLength,
    });

    const result = await finalizeResumeUploadAction(
      initialResumeActionState,
      createMetadata(submittedBytes),
    );

    expect(result).toEqual({
      status: "error",
      message:
        "The uploaded file size could not be verified. Please upload it again.",
    });
    expect(mocks.extractResumeText).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns the extraction helper's safe message without finalizing", async () => {
    const bytes = new Uint8Array(Buffer.from("original TXT file", "utf8"));
    const { rpc } = prepareSupabase(bytes);
    const extractionError = new ResumeTextExtractionError("no_text");
    mocks.extractResumeText.mockRejectedValue(extractionError);

    const result = await finalizeResumeUploadAction(
      initialResumeActionState,
      createMetadata(bytes),
    );

    expect(result).toEqual({
      status: "error",
      message: extractionError.safeMessage,
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
