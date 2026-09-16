"use client";

import { CalendarPlus, Mail, MapPin, NotebookPen, UserPlus } from "lucide-react";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import {
  deleteApplicationEventAction,
  deleteApplicationNoteAction,
  deleteContactAction,
  saveApplicationEventAction,
  saveApplicationNoteAction,
  saveContactAction,
  setEventCompletedAction,
} from "@/actions/crm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { initialCrmActionState } from "@/lib/action-states";
import { eventTypes } from "@/lib/validation/crm";

export type ApplicationCrmViewData = {
  contacts: Array<{
    id: string;
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    linkedinUrl: string | null;
    notes: string | null;
  }>;
  events: Array<{
    id: string;
    type: (typeof eventTypes)[number];
    title: string;
    startsAt: string;
    endsAt: string | null;
    meetingUrl: string | null;
    location: string | null;
    notes: string | null;
    completedAt: string | null;
  }>;
  notes: Array<{
    id: string;
    body: string;
    createdAt: string;
  }>;
};

const eventTypeLabels: Record<(typeof eventTypes)[number], string> = {
  recruiter_call: "Recruiter call",
  screening: "Screening",
  technical_interview: "Technical interview",
  behavioral_interview: "Behavioral interview",
  system_design: "System design",
  technical_assessment: "Technical assessment",
  final_interview: "Final interview",
  follow_up: "Follow-up",
  other: "Other",
};

function isoFromLocal(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? "" : parsed.toISOString();
}

function localInputFromIso(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function formatUtcDateTime(value: string) {
  return `${new Intl.DateTimeFormat("en", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))} UTC`;
}

function useCrmActionFeedback(state: { status: string; message?: string }) {
  const previous = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!state.message || previous.current === state.message) return;
    previous.current = state.message;
    if (state.status === "success") toast.success(state.message);
    if (state.status === "error") toast.error(state.message);
  }, [state]);
}

export function ApplicationCrm({
  applicationId,
  data,
}: {
  applicationId: string;
  data: ApplicationCrmViewData;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <ContactsPanel applicationId={applicationId} contacts={data.contacts} />
      <EventsPanel applicationId={applicationId} events={data.events} />
      <NotesPanel applicationId={applicationId} notes={data.notes} />
    </div>
  );
}

function ContactsPanel({
  applicationId,
  contacts,
}: {
  applicationId: string;
  contacts: ApplicationCrmViewData["contacts"];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<(typeof contacts)[number] | null>(null);
  const [state, action, pending] = useActionState(
    saveContactAction,
    initialCrmActionState,
  );
  useCrmActionFeedback(state);

  return (
    <section className="rounded-lg border border-border bg-paper p-5" aria-labelledby="contacts-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="contacts-heading" className="font-display text-xl font-semibold text-evergreen-deep">Contacts</h2>
        <Button size="sm" variant="outline" onClick={() => { setEditing(null); setOpen((value) => !value); }}>
          <UserPlus aria-hidden="true" /> Add
        </Button>
      </div>
      {open ? (
        <form key={editing?.id ?? "new"} action={action} className="mt-4 space-y-3 rounded-md border border-border bg-background p-3">
          <input type="hidden" name="applicationId" value={applicationId} />
          {editing ? <input type="hidden" name="contactId" value={editing.id} /> : null}
          <Field label="Name" name="name" defaultValue={editing?.name} required />
          <Field label="Role" name="role" defaultValue={editing?.role ?? ""} placeholder="Recruiter" />
          <Field label="Email" name="email" defaultValue={editing?.email ?? ""} type="email" />
          <Field label="Phone" name="phone" defaultValue={editing?.phone ?? ""} type="tel" />
          <Field label="LinkedIn" name="linkedinUrl" defaultValue={editing?.linkedinUrl ?? ""} type="url" />
          <div className="space-y-1.5"><Label htmlFor={`contact-notes-${editing?.id ?? "new"}`}>Notes</Label><Textarea id={`contact-notes-${editing?.id ?? "new"}`} name="notes" defaultValue={editing?.notes ?? ""} rows={3} /></div>
          <div className="flex gap-2"><Button size="sm" disabled={pending}>{pending ? "Saving…" : editing ? "Save changes" : "Save contact"}</Button>{editing ? <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(null); setOpen(false); }}>Cancel</Button> : null}</div>
        </form>
      ) : null}
      <div className="mt-4 space-y-3">
        {contacts.length === 0 ? <EmptyCopy>No contacts added.</EmptyCopy> : contacts.map((contact) => (
          <div key={contact.id} className="rounded-md border border-border p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{contact.name}</p>
                {contact.role ? <p className="text-xs text-muted-foreground">{contact.role}</p> : null}
              </div>
              <div className="flex items-center"><Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(contact); setOpen(true); }}>Edit</Button><CompactDelete action={deleteContactAction} applicationId={applicationId} itemName="contactId" itemId={contact.id} label={`Delete ${contact.name}`} /></div>
            </div>
            {contact.email ? <a className="mt-2 flex items-center gap-2 text-xs text-cobalt hover:underline" href={`mailto:${contact.email}`}><Mail className="size-3" />{contact.email}</a> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function EventsPanel({ applicationId, events }: { applicationId: string; events: ApplicationCrmViewData["events"] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<(typeof events)[number] | null>(null);
  const [state, action, pending] = useActionState(saveApplicationEventAction, initialCrmActionState);
  useCrmActionFeedback(state);

  function eventAction(formData: FormData) {
    formData.set("startsAt", isoFromLocal(formData.get("startsAt")));
    const endsAt = isoFromLocal(formData.get("endsAt"));
    if (endsAt) formData.set("endsAt", endsAt); else formData.delete("endsAt");
    action(formData);
  }

  return (
    <section className="rounded-lg border border-border bg-paper p-5" aria-labelledby="events-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="events-heading" className="font-display text-xl font-semibold text-evergreen-deep">Interviews</h2>
        <Button size="sm" variant="outline" onClick={() => { setEditing(null); setOpen((value) => !value); }}><CalendarPlus /> Add</Button>
      </div>
      {open ? (
        <form key={editing?.id ?? "new"} action={eventAction} className="mt-4 space-y-3 rounded-md border border-border bg-background p-3">
          <input type="hidden" name="applicationId" value={applicationId} />
          {editing ? <input type="hidden" name="eventId" value={editing.id} /> : null}
          <div className="space-y-1.5"><Label htmlFor={`event-type-${applicationId}`}>Type</Label><NativeSelect id={`event-type-${applicationId}`} name="type" defaultValue={editing?.type ?? "technical_interview"}>{eventTypes.map((type) => <option key={type} value={type}>{eventTypeLabels[type]}</option>)}</NativeSelect></div>
          <Field label="Title" name="title" defaultValue={editing?.title ?? ""} placeholder="Technical interview" required />
          <Field label="Starts (device time)" name="startsAt" defaultValue={localInputFromIso(editing?.startsAt ?? null)} type="datetime-local" suppressHydrationWarning required />
          <Field label="Ends (device time)" name="endsAt" defaultValue={localInputFromIso(editing?.endsAt ?? null)} type="datetime-local" suppressHydrationWarning />
          <Field label="Meeting link" name="meetingUrl" defaultValue={editing?.meetingUrl ?? ""} type="url" />
          <Field label="Location" name="location" defaultValue={editing?.location ?? ""} />
          <div className="space-y-1.5"><Label htmlFor={`event-notes-${editing?.id ?? "new"}`}>Notes</Label><Textarea id={`event-notes-${editing?.id ?? "new"}`} name="notes" defaultValue={editing?.notes ?? ""} rows={3} /></div>
          <div className="flex gap-2"><Button size="sm" disabled={pending}>{pending ? "Saving…" : editing ? "Save changes" : "Save interview"}</Button>{editing ? <Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(null); setOpen(false); }}>Cancel</Button> : null}</div>
        </form>
      ) : null}
      <div className="mt-4 space-y-3">
        {events.length === 0 ? <EmptyCopy>No interviews scheduled.</EmptyCopy> : events.map((event) => (
          <div key={event.id} className="rounded-md border border-border p-3">
            <div className="flex items-start justify-between gap-3"><div><Badge variant={event.completedAt ? "neutral" : "warning"}>{eventTypeLabels[event.type]}</Badge><p className="mt-2 font-semibold">{event.title}</p><time className="mt-1 block text-xs text-muted-foreground" dateTime={event.startsAt}>{formatUtcDateTime(event.startsAt)}</time></div><div className="flex items-center"><Button type="button" size="sm" variant="ghost" onClick={() => { setEditing(event); setOpen(true); }}>Edit</Button><CompactDelete action={deleteApplicationEventAction} applicationId={applicationId} itemName="eventId" itemId={event.id} label={`Delete ${event.title}`} /></div></div>
            {event.location ? <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3" />{event.location}</p> : null}
            <CompleteEvent applicationId={applicationId} eventId={event.id} completed={Boolean(event.completedAt)} />
          </div>
        ))}
      </div>
    </section>
  );
}

function NotesPanel({ applicationId, notes }: { applicationId: string; notes: ApplicationCrmViewData["notes"] }) {
  const [editing, setEditing] = useState<(typeof notes)[number] | null>(null);
  const [state, action, pending] = useActionState(saveApplicationNoteAction, initialCrmActionState);
  useCrmActionFeedback(state);
  return (
    <section className="rounded-lg border border-border bg-paper p-5" aria-labelledby="notes-heading">
      <div className="flex items-center gap-2"><NotebookPen className="size-4 text-cobalt" /><h2 id="notes-heading" className="font-display text-xl font-semibold text-evergreen-deep">Notes</h2></div>
      <form key={editing?.id ?? "new"} action={action} className="mt-4 space-y-3">
        <input type="hidden" name="applicationId" value={applicationId} />
        {editing ? <input type="hidden" name="noteId" value={editing.id} /> : null}
        <Label htmlFor={`note-${applicationId}`} className="sr-only">Add note</Label>
        <Textarea id={`note-${applicationId}`} name="body" defaultValue={editing?.body ?? ""} rows={4} maxLength={20_000} placeholder="Recruiter context, interview observations, questions to ask…" required />
        <div className="flex gap-2"><Button size="sm" variant="evergreen" disabled={pending}>{pending ? "Saving…" : editing ? "Save note" : "Add note"}</Button>{editing ? <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button> : null}</div>
      </form>
      <div className="mt-4 space-y-3">
        {notes.length === 0 ? <EmptyCopy>No timeline notes yet.</EmptyCopy> : notes.map((note) => (
          <article key={note.id} className="rounded-md border border-border p-3"><div className="flex items-start justify-between gap-3"><p className="whitespace-pre-wrap text-sm leading-6">{note.body}</p><div className="flex items-center"><Button type="button" size="sm" variant="ghost" onClick={() => setEditing(note)}>Edit</Button><CompactDelete action={deleteApplicationNoteAction} applicationId={applicationId} itemName="noteId" itemId={note.id} label="Delete note" /></div></div><time className="mt-2 block text-[0.68rem] text-muted-foreground" dateTime={note.createdAt}>{formatUtcDateTime(note.createdAt)}</time></article>
        ))}
      </div>
    </section>
  );
}

function Field({ label, name, ...props }: { label: string; name: string } & React.ComponentProps<typeof Input>) {
  const generatedId = useId();
  const id = `${name}-${generatedId}`;
  return <div className="space-y-1.5"><Label htmlFor={id}>{label}</Label><Input id={id} name={name} {...props} /></div>;
}

function EmptyCopy({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-input p-4 text-center text-xs text-muted-foreground">{children}</p>;
}

function CompactDelete({ action, applicationId, itemName, itemId, label = "Delete" }: { action: typeof deleteContactAction; applicationId: string; itemName: string; itemId: string; label?: string }) {
  const [state, formAction, pending] = useActionState(action, initialCrmActionState);
  useCrmActionFeedback(state);
  return <form action={formAction}><input type="hidden" name="applicationId" value={applicationId} /><input type="hidden" name={itemName} value={itemId} /><Button size="sm" variant="ghost" aria-label={label} disabled={pending}>×</Button></form>;
}

function CompleteEvent({ applicationId, eventId, completed }: { applicationId: string; eventId: string; completed: boolean }) {
  const [state, action, pending] = useActionState(setEventCompletedAction, initialCrmActionState);
  useCrmActionFeedback(state);
  return <form action={action} className="mt-3"><input type="hidden" name="applicationId" value={applicationId} /><input type="hidden" name="eventId" value={eventId} /><input type="hidden" name="completed" value={completed ? "false" : "true"} /><Button size="sm" variant="ghost" disabled={pending}>{completed ? "Mark upcoming" : "Mark complete"}</Button></form>;
}
