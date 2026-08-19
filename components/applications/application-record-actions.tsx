"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Archive, ArchiveRestore, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import {
  archiveApplicationAction,
  deleteApplicationAction,
  restoreApplicationAction,
} from "@/actions/applications";
import { Button } from "@/components/ui/button";
import {
  INITIAL_APPLICATION_ACTION_STATE,
  type ApplicationActionState,
} from "@/lib/validation/application";

type ApplicationRecordActionsProps = {
  applicationId: string;
  archived: boolean;
};

function ApplicationRecordActions({
  applicationId,
  archived,
}: ApplicationRecordActionsProps) {
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveApplicationAction,
    INITIAL_APPLICATION_ACTION_STATE,
  );
  const [restoreState, restoreAction, restorePending] = useActionState(
    restoreApplicationAction,
    INITIAL_APPLICATION_ACTION_STATE,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteApplicationAction,
    INITIAL_APPLICATION_ACTION_STATE,
  );

  useActionToast(archiveState);
  useActionToast(restoreState);
  useActionToast(deleteState);

  return (
    <div className="flex flex-wrap gap-2">
      {archived ? (
        <form action={restoreAction}>
          <input type="hidden" name="id" value={applicationId} />
          <Button type="submit" variant="outline" disabled={restorePending}>
            <ArchiveRestore aria-hidden="true" />
            {restorePending ? "Restoring…" : "Restore file"}
          </Button>
        </form>
      ) : (
        <ConfirmDialog
          title="Archive this application?"
          description="It will leave your active desk but remain available in the archive, with its history and notes intact."
          trigger={
            <Button type="button" variant="outline">
              <Archive aria-hidden="true" /> Archive
            </Button>
          }
          confirmLabel={archivePending ? "Archiving…" : "Archive file"}
          pending={archivePending}
          action={archiveAction}
          applicationId={applicationId}
        />
      )}

      <ConfirmDialog
        title="Permanently delete this case?"
        description="This cannot be undone. The application and its stage history, notes, contacts, and events will be permanently removed."
        trigger={
          <Button type="button" variant="ghost" className="text-destructive hover:bg-rose-soft hover:text-destructive">
            <Trash2 aria-hidden="true" /> Delete permanently
          </Button>
        }
        confirmLabel={deletePending ? "Deleting…" : "Delete permanently"}
        pending={deletePending}
        destructive
        action={deleteAction}
        applicationId={applicationId}
        confirmDelete
      />
    </div>
  );
}

function ConfirmDialog({
  title,
  description,
  trigger,
  confirmLabel,
  pending,
  destructive = false,
  action,
  applicationId,
  confirmDelete = false,
}: {
  title: string;
  description: string;
  trigger: React.ReactNode;
  confirmLabel: string;
  pending: boolean;
  destructive?: boolean;
  action: (formData: FormData) => void;
  applicationId: string;
  confirmDelete?: boolean;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-evergreen-deep/35 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-paper p-5 outline-none sm:p-6">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-rose">Confirm action</p>
              <AlertDialog.Title className="mt-2 font-display text-2xl font-semibold text-evergreen-deep">
                {title}
              </AlertDialog.Title>
            </div>
            <AlertDialog.Cancel asChild>
              <Button type="button" size="icon" variant="ghost" aria-label="Close confirmation">
                <X aria-hidden="true" />
              </Button>
            </AlertDialog.Cancel>
          </div>
          <AlertDialog.Description className="mt-3 text-sm leading-6 text-muted-foreground">
            {description}
          </AlertDialog.Description>

          <form action={action} className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <input type="hidden" name="id" value={applicationId} />
            {confirmDelete ? <input type="hidden" name="confirmDelete" value="true" /> : null}
            <AlertDialog.Cancel asChild>
              <Button type="button" variant="ghost">Keep file</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button type="submit" variant={destructive ? "destructive" : "evergreen"} disabled={pending}>
                {destructive ? <Trash2 aria-hidden="true" /> : <Archive aria-hidden="true" />}
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </form>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function useActionToast(state: ApplicationActionState) {
  const latestMessage = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!state.message || state.message === latestMessage.current) return;
    latestMessage.current = state.message;

    if (state.status === "success") toast.success(state.message);
    if (state.status === "error") toast.error(state.message);
  }, [state]);
}

export { ApplicationRecordActions };
