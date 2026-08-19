// @vitest-environment node

import { Buffer } from "node:buffer";

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  extractResumeText,
  MAX_EXTRACTED_RESUME_CHARACTERS,
  MAX_PDF_RESUME_PAGES,
  ResumeTextExtractionError,
} from "./extract-text.server";

const PDF_MIME_TYPE = "application/pdf";
const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const TXT_MIME_TYPE = "text/plain";

// A minimal standards-shaped DOCX containing two paragraphs. Keeping it as a
// base64 fixture makes the binary test input portable across platforms.
const MINIMAL_DOCX_BASE64 =
  "UEsDBAoAAAAIAFRJEl15bjPX6AAAAK0BAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH1QyU7DMBD9FWuuKHHggBCK0wPLETiUDxjZk8SqN3nc0v49Tlt6QIXjzFv1+tXeO7GjzDYGBbdtB4KCjsaGScHn+rV5AMEFg0EXAyk4EMNq6NeHRCyqNrCCuZT0KCXrmTxyGxOFiowxeyz1zJNMqDc4kbzrunupYygUSlMWDxj6Zxpx64p42df3qUcmxyCeTsQlSwGm5KzGUnG5C+ZXSnNOaKvyyOHZJr6pBJBXExbk74Cz7r0Ok60h8YG5vKGvLPkVs5Em6q2vyvZ/mys94zhaTRf94pZy1MRcF/euvSAebfjpL49zD99QSwMECgAAAAAAVEkSXQAAAAAAAAAAAAAAAAYAAABfcmVscy9QSwMECgAAAAgAVEkSXZv9N+qtAAAAKQEAAAsAAABfcmVscy8ucmVsc43POw7CMAwG4KtE3mlaBoRQ0y4IqSsqB7ASN61oHkrCo7cnAwNFDIy2f3+W6/ZpZnanECdnBVRFCYysdGqyWsClP232wGJCq3B2lgQsFKFt6jPNmPJKHCcfWTZsFDCm5A+cRzmSwVg4TzZPBhcMplwGzT3KK2ri27Lc8fBpwNpknRIQOlUB6xdP/9huGCZJRydvhmz6ceIrkWUMmpKAhwuKq3e7yCzwpuarF5sXUEsDBAoAAAAAAFRJEl0AAAAAAAAAAAAAAAAFAAAAd29yZC9QSwMECgAAAAgAVEkSXRlG6zXDAAAAHgEAABEAAAB3b3JkL2RvY3VtZW50LnhtbG2PQU7EMAxFrxJlz6SwQKhqOxISrFgMmuEAITGdiMaObEPp7UmGBRJi8yx/63/bw/4rL+YTWBLhaK93nTWAgWLCebQvp8erO2tEPUa/EMJoNxC7n4a1jxQ+MqCaGoDSr6M9q5beOQlnyF52VADr7I04e60tz24ljoUpgEjNz4u76bpbl31C2yJfKW6tlgZu0Oneh3fAaB5wTgjAg2tqI19Y/hpOW4Fj4FTU1KvNgURnhuPz079OgaAHdhfhZ737fW36BlBLAQIUAAoAAAAIAFRJEl15bjPX6AAAAK0BAAATAAAAAAAAAAAAAAAAAAAAAABbQ29udGVudF9UeXBlc10ueG1sUEsBAhQACgAAAAAAVEkSXQAAAAAAAAAAAAAAAAYAAAAAAAAAAAAQAAAAGQEAAF9yZWxzL1BLAQIUAAoAAAAIAFRJEl2b/TfqrQAAACkBAAALAAAAAAAAAAAAAAAAAD0BAABfcmVscy8ucmVsc1BLAQIUAAoAAAAAAFRJEl0AAAAAAAAAAAAAAAAFAAAAAAAAAAAAEAAAABMCAAB3b3JkL1BLAQIUAAoAAAAIAFRJEl0ZRus1wwAAAB4BAAARAAAAAAAAAAAAAAAAADYCAAB3b3JkL2RvY3VtZW50LnhtbFBLBQYAAAAABQAFACABAAAoAwAAAAA=";

function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function createPdf(pages: string[]): Uint8Array {
  const fontObjectId = 3 + pages.length * 2;
  const objects: string[] = new Array(fontObjectId + 1);
  const pageObjectIds = pages.map((_, index) => 3 + index * 2);

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] =
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] ` +
    `/Count ${pages.length} >>`;

  pages.forEach((text, index) => {
    const pageObjectId = pageObjectIds[index];
    const contentObjectId = pageObjectId + 1;
    const stream =
      "BT\n/F1 12 Tf\n72 720 Td\n" +
      `(${escapePdfText(text)}) Tj\n` +
      "ET";

    objects[pageObjectId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
      `/Resources << /Font << /F1 ${fontObjectId} 0 R >> >> ` +
      `/Contents ${contentObjectId} 0 R >>`;
    objects[contentObjectId] =
      `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\n` +
      `stream\n${stream}\nendstream`;
  });

  objects[fontObjectId] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let pdf = "%PDF-1.4\n";
  const offsets = new Array<number>(objects.length).fill(0);

  for (let objectId = 1; objectId < objects.length; objectId += 1) {
    offsets[objectId] = Buffer.byteLength(pdf, "latin1");
    pdf += `${objectId} 0 obj\n${objects[objectId]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += "0000000000 65535 f \n";

  for (let objectId = 1; objectId < objects.length; objectId += 1) {
    pdf += `${String(offsets[objectId]).padStart(10, "0")} 00000 n \n`;
  }

  pdf +=
    `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF`;

  return new Uint8Array(Buffer.from(pdf, "latin1"));
}

function findZipSignature(bytes: Uint8Array, signature: readonly number[]) {
  for (let offset = 0; offset <= bytes.byteLength - signature.length; offset += 1) {
    if (signature.every((byte, index) => bytes[offset + index] === byte)) {
      return offset;
    }
  }

  throw new Error("Fixture ZIP signature not found.");
}

function mutateFirstCentralDirectoryEntry(
  mutate: (view: DataView, offset: number) => void,
): Uint8Array {
  const bytes = new Uint8Array(Buffer.from(MINIMAL_DOCX_BASE64, "base64"));
  const centralDirectoryOffset = findZipSignature(bytes, [
    0x50, 0x4b, 0x01, 0x02,
  ]);
  mutate(
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    centralDirectoryOffset,
  );
  return bytes;
}

async function expectExtractionCode(
  promise: Promise<unknown>,
  code: ResumeTextExtractionError["code"],
) {
  await expect(promise).rejects.toMatchObject({
    name: "ResumeTextExtractionError",
    code,
  });
}

describe("extractResumeText", () => {
  it("extracts normalized text from a real multi-page PDF", async () => {
    const text = await extractResumeText({
      bytes: createPdf(["Backend Engineer", "TypeScript and PostgreSQL"]),
      mimeType: PDF_MIME_TYPE,
    });

    expect(text).toContain("Backend Engineer");
    expect(text).toContain("TypeScript and PostgreSQL");
  });

  it("rejects PDFs beyond the resume page limit before extracting pages", async () => {
    await expectExtractionCode(
      extractResumeText({
        bytes: createPdf(
          Array.from(
            { length: MAX_PDF_RESUME_PAGES + 1 },
            (_, index) => `Page ${index + 1}`,
          ),
        ),
        mimeType: PDF_MIME_TYPE,
      }),
      "pdf_page_limit",
    );
  });

  it("extracts raw paragraph text from a real DOCX fixture", async () => {
    const text = await extractResumeText({
      bytes: new Uint8Array(Buffer.from(MINIMAL_DOCX_BASE64, "base64")),
      mimeType: DOCX_MIME_TYPE,
    });

    expect(text).toBe("Backend Engineer\n\nTypeScript and PostgreSQL");
  });

  it("rejects malformed and suspicious DOCX central-directory declarations", async () => {
    const malformedDirectory = mutateFirstCentralDirectoryEntry(
      (view, offset) => view.setUint32(offset, 0, true),
    );
    const oversizedEntry = mutateFirstCentralDirectoryEntry((view, offset) =>
      view.setUint32(offset + 24, 10 * 1024 * 1024 + 1, true),
    );
    const suspiciousRatio = mutateFirstCentralDirectoryEntry((view, offset) => {
      view.setUint32(offset + 20, 1, true);
      view.setUint32(offset + 24, 1_000, true);
    });

    for (const bytes of [
      malformedDirectory,
      oversizedEntry,
      suspiciousRatio,
    ]) {
      await expectExtractionCode(
        extractResumeText({ bytes, mimeType: DOCX_MIME_TYPE }),
        "parse_failed",
      );
    }
  });

  it.each([
    {
      name: "UTF-8 BOM",
      bytes: new Uint8Array([
        0xef,
        0xbb,
        0xbf,
        ...Buffer.from("Résumé\r\nTypeScript\u0007", "utf8"),
      ]),
    },
    {
      name: "UTF-16 little-endian BOM",
      bytes: new Uint8Array([
        0xff,
        0xfe,
        ...Buffer.from("Résumé\r\nTypeScript", "utf16le"),
      ]),
    },
    {
      name: "UTF-16 big-endian BOM",
      bytes: new Uint8Array([
        0xfe,
        0xff,
        ...Buffer.from("Résumé\r\nTypeScript", "utf16le").swap16(),
      ]),
    },
  ])("decodes and normalizes $name text", async ({ bytes }) => {
    await expect(
      extractResumeText({ bytes, mimeType: TXT_MIME_TYPE }),
    ).resolves.toBe("Résumé\nTypeScript");
  });

  it("rejects binary or invalidly encoded TXT content", async () => {
    await expectExtractionCode(
      extractResumeText({
        bytes: new Uint8Array([0x52, 0x00, 0x65, 0x00]),
        mimeType: TXT_MIME_TYPE,
      }),
      "invalid_text_encoding",
    );

    await expectExtractionCode(
      extractResumeText({
        bytes: new Uint8Array([0xc3, 0x28]),
        mimeType: TXT_MIME_TYPE,
      }),
      "invalid_text_encoding",
    );
  });

  it("validates MIME support and PDF/DOCX magic bytes", async () => {
    await expectExtractionCode(
      extractResumeText({
        bytes: new Uint8Array(Buffer.from("plain text")),
        mimeType: "application/rtf",
      }),
      "unsupported_mime_type",
    );

    await expectExtractionCode(
      extractResumeText({
        bytes: new Uint8Array(Buffer.from("plain text")),
        mimeType: PDF_MIME_TYPE,
      }),
      "mime_mismatch",
    );

    await expectExtractionCode(
      extractResumeText({
        bytes: new Uint8Array(Buffer.from("plain text")),
        mimeType: DOCX_MIME_TYPE,
      }),
      "mime_mismatch",
    );
  });

  it("rejects files above the upload limit before parsing", async () => {
    await expectExtractionCode(
      extractResumeText({
        bytes: new Uint8Array(5 * 1024 * 1024 + 1),
        mimeType: TXT_MIME_TYPE,
      }),
      "file_too_large",
    );
  });

  it("returns only safe typed failures for corrupt and empty files", async () => {
    const corruptPdf = new Uint8Array(Buffer.from("%PDF-1.4\nnot a PDF"));
    const corruptDocx = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]);

    await expectExtractionCode(
      extractResumeText({ bytes: corruptPdf, mimeType: PDF_MIME_TYPE }),
      "parse_failed",
    );

    await expectExtractionCode(
      extractResumeText({ bytes: corruptDocx, mimeType: DOCX_MIME_TYPE }),
      "parse_failed",
    );

    await expectExtractionCode(
      extractResumeText({
        bytes: new Uint8Array(),
        mimeType: TXT_MIME_TYPE,
      }),
      "no_text",
    );
  });

  it("enforces the normalized text character limit", async () => {
    await expectExtractionCode(
      extractResumeText({
        bytes: new Uint8Array(
          Buffer.from("a".repeat(MAX_EXTRACTED_RESUME_CHARACTERS + 1)),
        ),
        mimeType: TXT_MIME_TYPE,
      }),
      "text_too_long",
    );
  });

  it("exposes a user-safe message without parser or document content", () => {
    const error = new ResumeTextExtractionError("parse_failed");

    expect(error.safeMessage).toBe(error.message);
    expect(error.message).toBe(
      "We could not read this resume file. Paste the resume text or choose another file and try again.",
    );
  });
});
