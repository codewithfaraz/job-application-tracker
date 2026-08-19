"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  archiveResumeAction,
  deleteResumeAction,
  initialResumeActionState,
  restoreResumeAction,
} from "@/actions/resumes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResumeActions({
  resumeId,
  archived,
  applicationCount,
}: {
  resumeId: string;
  archived: boolean;
  applicationCount: number;
}) {
  const action = archived ? restoreResumeAction : archiveResumeAction;
  const [archiveState, archiveFormAction, archivePending] = useActionState(
    action,
    initialResumeActionState,
  );
  const [deleteState, deleteFormAction, deletePending] = useActionState(
    deleteResumeAction,
    initialResumeActionState,
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (archiveState.status === "success") toast.success(archiveState.message);
    if (archiveState.status === "error") toast.error(archiveState.message);
  }, [archiveState]);

  useEffect(() => {
    if (deleteState.status === "success") {
      toast.success(deleteState.message);
    }
    if (deleteState.status === "error") toast.error(deleteState.message);
  }, [deleteState]);

  return (
    <div className="mt-4 border-t border-border pt-4">
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <a href={`/resumes/${resumeId}/download`}>Download</a>
        </Button>
        <form action={archiveFormAction}>
          <input type="hidden" name="resumeId" value={resumeId} />
          <Button size="sm" variant="ghost" disabled={archivePending}>
            {archived ? "Restore" : "Archive"}
          </Button>
        </form>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={applicationCount > 0}
          title={
            applicationCount > 0
              ? "A submitted resume is protected from deletion."
              : undefined
          }
          onClick={() => setConfirmingDelete((current) => !current)}
        >
          Delete
        </Button>
      </div>

      {confirmingDelete ? (
        <form action={deleteFormAction} className="mt-4 rounded-md border border-rose/30 bg-rose-soft p-3">
          <input type="hidden" name="resumeId" value={resumeId} />
          <Label htmlFor={`delete-resume-${resumeId}`}>Type DELETE to confirm</Label>
          <div className="mt-2 flex gap-2">
            <Input
              id={`delete-resume-${resumeId}`}
              name="confirmation"
              autoComplete="off"
              className="h-8"
              required
            />
            <Button size="sm" variant="destructive" disabled={deletePending}>
              {deletePending ? "Deleting…" : "Delete forever"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
