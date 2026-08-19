import "server-only";

import { Buffer } from "node:buffer";

import {
  allowedResumeMimeTypes,
  MAX_RESUME_BYTES,
} from "@/lib/validation/resume";

export const MAX_EXTRACTED_RESUME_CHARACTERS = 100_000;
export const MAX_PDF_RESUME_PAGES = 40;

const MAX_PDF_IMAGE_PIXELS = 16_777_216;
const MAX_DOCX_ZIP_ENTRIES = 1_000;
const MAX_DOCX_ENTRY_UNCOMPRESSED_BYTES = 10 * 1024 * 1024;
const MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES = 25 * 1024 * 1024;
const MAX_DOCX_COMPRESSION_RATIO = 200;

const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIGNATURE = 0x07064b50;

export type ResumeTextExtractionErrorCode =
  | "unsupported_mime_type"
  | "file_too_large"
  | "mime_mismatch"
  | "invalid_text_encoding"
  | "pdf_page_limit"
  | "text_too_long"
  | "password_protected"
  | "no_text"
  | "parse_failed";

const SAFE_ERROR_MESSAGES = {
  unsupported_mime_type: "Upload a PDF, DOCX, or TXT resume.",
  file_too_large: "Resume files must be 5 MB or smaller.",
  mime_mismatch:
    "The file contents do not match the selected file type. Choose the original PDF, DOCX, or TXT file and try again.",
  invalid_text_encoding:
    "This text file is not valid UTF-8 or BOM-marked UTF-16. Save it as UTF-8 or paste the resume text and try again.",
  pdf_page_limit: `This PDF has more than ${MAX_PDF_RESUME_PAGES} pages. Upload a shorter resume or paste its text instead.`,
  text_too_long: `The extracted resume text is longer than ${MAX_EXTRACTED_RESUME_CHARACTERS.toLocaleString("en-US")} characters. Paste a shorter version and try again.`,
  password_protected:
    "This PDF is password-protected. Upload an unlocked copy or paste the resume text instead.",
  no_text:
    "No readable text was found in this file. If it is scanned or image-only, paste the resume text and try again.",
  parse_failed:
    "We could not read this resume file. Paste the resume text or choose another file and try again.",
} satisfies Record<ResumeTextExtractionErrorCode, string>;

export class ResumeTextExtractionError extends Error {
  readonly code: ResumeTextExtractionErrorCode;
  readonly safeMessage: string;

  constructor(code: ResumeTextExtractionErrorCode) {
    const safeMessage = SAFE_ERROR_MESSAGES[code];
    super(safeMessage);
    this.name = "ResumeTextExtractionError";
    this.code = code;
    this.safeMessage = safeMessage;
  }
}

export function isResumeTextExtractionError(
  error: unknown,
): error is ResumeTextExtractionError {
  return error instanceof ResumeTextExtractionError;
}

export type ResumeTextExtractionInput = Readonly<{
  bytes: Uint8Array;
  mimeType: string;
}>;

type SupportedResumeMimeType = (typeof allowedResumeMimeTypes)[number];

const supportedMimeTypes = new Set<string>(allowedResumeMimeTypes);

function isSupportedResumeMimeType(
  mimeType: string,
): mimeType is SupportedResumeMimeType {
  return supportedMimeTypes.has(mimeType);
}

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function assertMagicBytes(
  bytes: Uint8Array,
  mimeType: SupportedResumeMimeType,
): void {
  if (mimeType === "application/pdf") {
    if (!startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
      throw new ResumeTextExtractionError("mime_mismatch");
    }
    return;
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
    !startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])
  ) {
    throw new ResumeTextExtractionError("mime_mismatch");
  }
}

export function normalizeResumeText(text: string): string {
  const normalized = text
    .replace(/^\uFEFF/, "")
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) {
    throw new ResumeTextExtractionError("no_text");
  }

  if (normalized.length > MAX_EXTRACTED_RESUME_CHARACTERS) {
    throw new ResumeTextExtractionError("text_too_long");
  }

  return normalized;
}

export function validateResumeFileBytes({
  bytes,
  mimeType,
}: ResumeTextExtractionInput): void {
  if (!isSupportedResumeMimeType(mimeType)) {
    throw new ResumeTextExtractionError("unsupported_mime_type");
  }

  if (!(bytes instanceof Uint8Array)) {
    throw new ResumeTextExtractionError("parse_failed");
  }

  if (bytes.byteLength > MAX_RESUME_BYTES) {
    throw new ResumeTextExtractionError("file_too_large");
  }

  assertMagicBytes(bytes, mimeType);
}

function decodeTextFile(bytes: Uint8Array): string {
  let encoding: "utf-8" | "utf-16le" | "utf-16be" = "utf-8";
  let content = bytes;

  if (startsWith(bytes, [0xef, 0xbb, 0xbf])) {
    content = bytes.subarray(3);
  } else if (startsWith(bytes, [0xff, 0xfe])) {
    encoding = "utf-16le";
    content = bytes.subarray(2);
  } else if (startsWith(bytes, [0xfe, 0xff])) {
    encoding = "utf-16be";
    content = bytes.subarray(2);
  } else if (bytes.includes(0)) {
    throw new ResumeTextExtractionError("invalid_text_encoding");
  }

  try {
    return new TextDecoder(encoding, { fatal: true }).decode(content);
  } catch {
    throw new ResumeTextExtractionError("invalid_text_encoding");
  }
}

function findZipEndOfCentralDirectory(
  bytes: Uint8Array,
  view: DataView,
): number {
  const minimumRecordSize = 22;
  const maximumCommentSize = 0xffff;
  const minimumOffset = Math.max(
    0,
    bytes.byteLength - minimumRecordSize - maximumCommentSize,
  );

  for (
    let offset = bytes.byteLength - minimumRecordSize;
    offset >= minimumOffset;
    offset -= 1
  ) {
    if (
      view.getUint32(offset, true) !==
      ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE
    ) {
      continue;
    }

    const commentLength = view.getUint16(offset + 20, true);
    if (offset + minimumRecordSize + commentLength === bytes.byteLength) {
      return offset;
    }
  }

  throw new ResumeTextExtractionError("parse_failed");
}

function assertNoZip64ExtraField(
  view: DataView,
  extraOffset: number,
  extraLength: number,
): void {
  const extraEnd = extraOffset + extraLength;
  let cursor = extraOffset;

  while (cursor < extraEnd) {
    if (cursor + 4 > extraEnd) {
      throw new ResumeTextExtractionError("parse_failed");
    }

    const headerId = view.getUint16(cursor, true);
    const dataSize = view.getUint16(cursor + 2, true);
    cursor += 4;

    if (cursor + dataSize > extraEnd || headerId === 0x0001) {
      throw new ResumeTextExtractionError("parse_failed");
    }

    cursor += dataSize;
  }
}

/**
 * Mammoth expands DOCX ZIP entries in memory. Validate the declared central
 * directory first so ordinary compressed-document bombs never reach it.
 * This is deliberately limited to the single-disk, non-ZIP64 DOCX shape.
 */
function assertSafeDocxArchive(bytes: Uint8Array): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const endOffset = findZipEndOfCentralDirectory(bytes, view);

  if (
    endOffset >= 20 &&
    view.getUint32(endOffset - 20, true) ===
      ZIP64_END_OF_CENTRAL_DIRECTORY_LOCATOR_SIGNATURE
  ) {
    throw new ResumeTextExtractionError("parse_failed");
  }

  const diskNumber = view.getUint16(endOffset + 4, true);
  const centralDirectoryDisk = view.getUint16(endOffset + 6, true);
  const entriesOnDisk = view.getUint16(endOffset + 8, true);
  const totalEntries = view.getUint16(endOffset + 10, true);
  const centralDirectorySize = view.getUint32(endOffset + 12, true);
  const centralDirectoryOffset = view.getUint32(endOffset + 16, true);

  if (
    diskNumber !== 0 ||
    centralDirectoryDisk !== 0 ||
    entriesOnDisk !== totalEntries ||
    totalEntries === 0xffff ||
    centralDirectorySize === 0xffffffff ||
    centralDirectoryOffset === 0xffffffff ||
    totalEntries === 0 ||
    totalEntries > MAX_DOCX_ZIP_ENTRIES
  ) {
    throw new ResumeTextExtractionError("parse_failed");
  }

  const centralDirectoryEnd =
    centralDirectoryOffset + centralDirectorySize;
  if (
    centralDirectoryOffset >= endOffset ||
    centralDirectoryEnd !== endOffset
  ) {
    throw new ResumeTextExtractionError("parse_failed");
  }

  let cursor = centralDirectoryOffset;
  let totalUncompressedBytes = 0;

  for (let entryIndex = 0; entryIndex < totalEntries; entryIndex += 1) {
    const fixedHeaderSize = 46;
    if (
      cursor + fixedHeaderSize > centralDirectoryEnd ||
      view.getUint32(cursor, true) !== ZIP_CENTRAL_DIRECTORY_SIGNATURE
    ) {
      throw new ResumeTextExtractionError("parse_failed");
    }

    const flags = view.getUint16(cursor + 8, true);
    const compressionMethod = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const filenameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const diskStart = view.getUint16(cursor + 34, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);
    const recordEnd =
      cursor +
      fixedHeaderSize +
      filenameLength +
      extraLength +
      commentLength;

    if (
      recordEnd > centralDirectoryEnd ||
      (flags & 0x0001) !== 0 ||
      (compressionMethod !== 0 && compressionMethod !== 8) ||
      compressedSize === 0xffffffff ||
      uncompressedSize === 0xffffffff ||
      diskStart === 0xffff ||
      diskStart !== 0 ||
      localHeaderOffset === 0xffffffff ||
      localHeaderOffset + 30 > centralDirectoryOffset ||
      view.getUint32(localHeaderOffset, true) !==
        ZIP_LOCAL_FILE_HEADER_SIGNATURE
    ) {
      throw new ResumeTextExtractionError("parse_failed");
    }

    const localFilenameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const localDataOffset =
      localHeaderOffset + 30 + localFilenameLength + localExtraLength;

    if (
      localDataOffset > centralDirectoryOffset ||
      compressedSize > centralDirectoryOffset - localDataOffset
    ) {
      throw new ResumeTextExtractionError("parse_failed");
    }

    assertNoZip64ExtraField(
      view,
      cursor + fixedHeaderSize + filenameLength,
      extraLength,
    );
    assertNoZip64ExtraField(
      view,
      localHeaderOffset + 30 + localFilenameLength,
      localExtraLength,
    );

    if (
      uncompressedSize > MAX_DOCX_ENTRY_UNCOMPRESSED_BYTES ||
      (uncompressedSize > 0 && compressedSize === 0) ||
      (compressedSize > 0 &&
        uncompressedSize / compressedSize > MAX_DOCX_COMPRESSION_RATIO)
    ) {
      throw new ResumeTextExtractionError("parse_failed");
    }

    totalUncompressedBytes += uncompressedSize;
    if (totalUncompressedBytes > MAX_DOCX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new ResumeTextExtractionError("parse_failed");
    }

    cursor = recordEnd;
  }

  if (cursor !== centralDirectoryEnd) {
    throw new ResumeTextExtractionError("parse_failed");
  }
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  let loadingTask:
    | ReturnType<
        (typeof import("pdfjs-dist/legacy/build/pdf.mjs"))["getDocument"]
      >
    | undefined;

  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    // The patched PDF.js 6 core no longer evaluates document JavaScript, and
    // this code never imports its viewer/annotation scripting layer. Keep both
    // legacy hardening flags explicitly false so a future compatible build
    // cannot opt into either behavior. Unknown init fields are ignored by v6.
    const hardenedOptions = {
      data: bytes.slice(),
      enableScripting: false as const,
      isEvalSupported: false as const,
      enableXfa: false,
      disableFontFace: true,
      isImageDecoderSupported: false,
      isOffscreenCanvasSupported: false,
      maxImageSize: MAX_PDF_IMAGE_PIXELS,
      stopAtErrors: true,
      useWasm: false,
      useWorkerFetch: false,
      verbosity: pdfjs.VerbosityLevel.ERRORS,
    };

    loadingTask = pdfjs.getDocument(hardenedOptions);
    const pdf = await loadingTask.promise;

    if (pdf.numPages > MAX_PDF_RESUME_PAGES) {
      throw new ResumeTextExtractionError("pdf_page_limit");
    }

    let text = "";

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);

      try {
        const content = await page.getTextContent();
        let pageText = "";

        for (const item of content.items) {
          if (!("str" in item)) continue;
          pageText += item.str;
          pageText += item.hasEOL ? "\n" : " ";
        }

        if (pageText.trim()) {
          text = text ? `${text}\n\n${pageText}` : pageText;
          text = normalizeResumeText(text);
        }
      } finally {
        page.cleanup();
      }
    }

    return normalizeResumeText(text);
  } catch (error) {
    if (isResumeTextExtractionError(error)) throw error;

    if (error instanceof Error && error.name === "PasswordException") {
      throw new ResumeTextExtractionError("password_protected");
    }

    throw new ResumeTextExtractionError("parse_failed");
  } finally {
    await loadingTask?.destroy().catch(() => undefined);
  }
}

async function extractDocxText(bytes: Uint8Array): Promise<string> {
  try {
    assertSafeDocxArchive(bytes);

    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({
      buffer: Buffer.from(bytes),
    });

    return normalizeResumeText(result.value);
  } catch (error) {
    if (isResumeTextExtractionError(error)) throw error;
    throw new ResumeTextExtractionError("parse_failed");
  }
}

/**
 * Extracts normalized text from a verified resume upload without logging or
 * exposing parser details. Callers may safely show `safeMessage` when this
 * rejects with `ResumeTextExtractionError`.
 */
export async function extractResumeText({
  bytes,
  mimeType,
}: ResumeTextExtractionInput): Promise<string> {
  validateResumeFileBytes({ bytes, mimeType });

  if (mimeType === "application/pdf") {
    return extractPdfText(bytes);
  }

  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractDocxText(bytes);
  }

  return normalizeResumeText(decodeTextFile(bytes));
}
