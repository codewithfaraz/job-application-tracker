"use client";

import { FileUp, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { toast } from "sonner";

import {
  cancelResumeUploadAction,
  finalizeResumeUploadAction,
  reserveResumeUploadAction,
} from "@/actions/resumes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { initialResumeActionState } from "@/lib/action-states";
import { createClient } from "@/lib/supabase/client";
import {
  allowedResumeMimeTypes,
  MAX_RESUME_BYTES,
  RESUME_BUCKET,
  safeResumeFilename,
} from "@/lib/validation/resume";

async function sha256Hex(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function ResumeUploadForm({ userId }: { userId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    const displayName = String(data.get("name") ?? "").trim();

    if (!(file instanceof File) || file.size === 0) {
      toast.error("Choose a PDF, DOCX, or TXT resume.");
      return;
    }
    if (file.size > MAX_RESUME_BYTES) {
      toast.error("Resume files must be 5 MB or smaller.");
      return;
    }
    if (
      !allowedResumeMimeTypes.includes(
        file.type as (typeof allowedResumeMimeTypes)[number],
      )
    ) {
      toast.error("Only PDF, DOCX, and TXT files are supported.");
      return;
    }
    if (!displayName) {
      toast.error("Give this resume a recognizable name.");
      return;
    }

    setPending(true);
    const resumeId = crypto.randomUUID();
    const storagePath = `${userId}/${resumeId}/${safeResumeFilename(file.name)}`;
    const supabase = createClient();
    let uploadReserved = false;

    try {
      const fileBuffer = await file.arrayBuffer();
      const fileHash = await sha256Hex(fileBuffer);
      const reservation = new FormData();
      reservation.set("id", resumeId);
      reservation.set("storagePath", storagePath);
      reservation.set("mimeType", file.type);
      reservation.set("fileSizeBytes", String(file.size));

      const reservationResult = await reserveResumeUploadAction(
        initialResumeActionState,
        reservation,
      );
      if (reservationResult.status !== "success") {
        throw new Error(
          reservationResult.message ?? "The upload could not be reserved.",
        );
      }
      uploadReserved = true;

      // ArrayBuffer uses Storage's raw-binary path instead of multipart form
      // data, so the permission check receives an exact content length that
      // can be matched to the reservation.
      const { error: uploadError } = await supabase.storage
        .from(RESUME_BUCKET)
        .upload(storagePath, fileBuffer, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      const metadata = new FormData();
      metadata.set("id", resumeId);
      metadata.set("name", displayName);
      metadata.set("originalFilename", file.name);
      metadata.set("storagePath", storagePath);
      metadata.set("mimeType", file.type);
      metadata.set("fileSizeBytes", String(file.size));
      metadata.set("fileHash", fileHash);
      metadata.set("extractedText", String(data.get("extractedText") ?? ""));

      const result = await finalizeResumeUploadAction(
        initialResumeActionState,
        metadata,
      );

      if (result.status !== "success") {
        throw new Error(result.message ?? "Resume details could not be saved.");
      }

      toast.success(result.message);
      formRef.current?.reset();
      router.refresh();
    } catch (error) {
      let cleanupMessage: string | undefined;
      if (uploadReserved) {
        await supabase.storage.from(RESUME_BUCKET).remove([storagePath]);
        const cleanup = new FormData();
        cleanup.set("id", resumeId);
        cleanup.set("storagePath", storagePath);
        const cleanupResult = await cancelResumeUploadAction(
          initialResumeActionState,
          cleanup,
        );
        cleanupMessage = cleanupResult.message;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "The resume could not be uploaded.";
      toast.error(
        cleanupMessage ? `${errorMessage} ${cleanupMessage}` : errorMessage,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="resume-name">Resume name</Label>
          <Input
            id="resume-name"
            name="name"
            placeholder="Backend resume"
            maxLength={100}
            required
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="resume-file">File</Label>
          <Input
            id="resume-file"
            name="file"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            required
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            PDF, DOCX, or TXT · 5 MB max
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="resume-text">Resume text override (optional)</Label>
        <Textarea
          id="resume-text"
          name="extractedText"
          rows={6}
          maxLength={100_000}
          placeholder="Paste text only if automatic extraction needs help."
          disabled={pending}
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Leave this blank to read text automatically from the file. Pasted text
          takes precedence and stays private; it is sent to AI only when you click
          Compare resume.
        </p>
      </div>
      <Button type="submit" variant="evergreen" disabled={pending}>
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : (
          <FileUp aria-hidden="true" />
        )}
        {pending ? "Uploading and reading…" : "Upload resume"}
      </Button>
    </form>
  );
}
