"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { CrmActionState } from "@/lib/action-states";
import { requireVerifiedIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  applicationEventSchema,
  contactSchema,
  noteSchema,
} from "@/lib/validation/crm";

function crmError(message: string): CrmActionState {
  return { status: "error", message };
}

function revalidateApplication(applicationId: string) {
  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

async function getOwnedApplication(applicationId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .select("id, company_id")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();

  return error ? null : data;
}

export async function saveContactAction(
  _previousState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const parsed = contactSchema.safeParse({
    applicationId: formData.get("applicationId"),
    contactId: formData.get("contactId") || undefined,
    name: formData.get("name"),
    role: formData.get("role") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    linkedinUrl: formData.get("linkedinUrl") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the contact details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { userId } = await requireVerifiedIdentity(
    `/applications/${parsed.data.applicationId}`,
  );
  const application = await getOwnedApplication(parsed.data.applicationId, userId);
  if (!application) return crmError("Application not found.");

  const supabase = await createClient();
  const values = {
    user_id: userId,
    application_id: application.id,
    company_id: application.company_id,
    name: parsed.data.name,
    role: parsed.data.role,
    email: parsed.data.email,
    phone: parsed.data.phone,
    linkedin_url: parsed.data.linkedinUrl,
    notes: parsed.data.notes,
  };

  const query = parsed.data.contactId
    ? supabase
        .from("contacts")
        .update(values)
        .eq("id", parsed.data.contactId)
        .eq("application_id", application.id)
        .eq("user_id", userId)
    : supabase.from("contacts").insert(values);
  const { error } = await query;

  if (error) return crmError("The contact could not be saved.");
  revalidateApplication(application.id);
  return { status: "success", message: "Contact saved." };
}

export async function deleteContactAction(
  _previousState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const parsed = z
    .object({ applicationId: z.string().uuid(), contactId: z.string().uuid() })
    .safeParse({
      applicationId: formData.get("applicationId"),
      contactId: formData.get("contactId"),
    });
  if (!parsed.success) return crmError("Invalid contact.");

  const { userId } = await requireVerifiedIdentity(
    `/applications/${parsed.data.applicationId}`,
  );
  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", parsed.data.contactId)
    .eq("application_id", parsed.data.applicationId)
    .eq("user_id", userId);

  if (error) return crmError("The contact could not be removed.");
  revalidateApplication(parsed.data.applicationId);
  return { status: "success", message: "Contact removed." };
}

export async function saveApplicationEventAction(
  _previousState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const parsed = applicationEventSchema.safeParse({
    applicationId: formData.get("applicationId"),
    eventId: formData.get("eventId") || undefined,
    type: formData.get("type"),
    title: formData.get("title"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt") || undefined,
    meetingUrl: formData.get("meetingUrl") || undefined,
    location: formData.get("location") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the interview details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { userId } = await requireVerifiedIdentity(
    `/applications/${parsed.data.applicationId}`,
  );
  const application = await getOwnedApplication(parsed.data.applicationId, userId);
  if (!application) return crmError("Application not found.");

  const supabase = await createClient();
  const values = {
    user_id: userId,
    application_id: application.id,
    type: parsed.data.type,
    title: parsed.data.title,
    starts_at: parsed.data.startsAt,
    ends_at: parsed.data.endsAt,
    meeting_url: parsed.data.meetingUrl,
    location: parsed.data.location,
    notes: parsed.data.notes,
  };

  const query = parsed.data.eventId
    ? supabase
        .from("application_events")
        .update(values)
        .eq("id", parsed.data.eventId)
        .eq("application_id", application.id)
        .eq("user_id", userId)
    : supabase.from("application_events").insert(values);
  const { error } = await query;

  if (error) return crmError("The interview could not be saved.");
  revalidateApplication(application.id);
  return { status: "success", message: "Interview saved." };
}

export async function setEventCompletedAction(
  _previousState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const parsed = z
    .object({
      applicationId: z.string().uuid(),
      eventId: z.string().uuid(),
      completed: z.enum(["true", "false"]),
    })
    .safeParse({
      applicationId: formData.get("applicationId"),
      eventId: formData.get("eventId"),
      completed: formData.get("completed"),
    });
  if (!parsed.success) return crmError("Invalid interview.");

  const { userId } = await requireVerifiedIdentity(
    `/applications/${parsed.data.applicationId}`,
  );
  const supabase = await createClient();
  const { error } = await supabase
    .from("application_events")
    .update({
      completed_at:
        parsed.data.completed === "true" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.eventId)
    .eq("application_id", parsed.data.applicationId)
    .eq("user_id", userId);

  if (error) return crmError("The interview could not be updated.");
  revalidateApplication(parsed.data.applicationId);
  return { status: "success", message: "Interview updated." };
}

export async function deleteApplicationEventAction(
  _previousState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const parsed = z
    .object({ applicationId: z.string().uuid(), eventId: z.string().uuid() })
    .safeParse({
      applicationId: formData.get("applicationId"),
      eventId: formData.get("eventId"),
    });
  if (!parsed.success) return crmError("Invalid interview.");
  const { userId } = await requireVerifiedIdentity(
    `/applications/${parsed.data.applicationId}`,
  );
  const supabase = await createClient();
  const { error } = await supabase
    .from("application_events")
    .delete()
    .eq("id", parsed.data.eventId)
    .eq("application_id", parsed.data.applicationId)
    .eq("user_id", userId);

  if (error) return crmError("The interview could not be removed.");
  revalidateApplication(parsed.data.applicationId);
  return { status: "success", message: "Interview removed." };
}

export async function saveApplicationNoteAction(
  _previousState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const parsed = noteSchema.safeParse({
    applicationId: formData.get("applicationId"),
    noteId: formData.get("noteId") || undefined,
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Write a note before saving.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { userId } = await requireVerifiedIdentity(
    `/applications/${parsed.data.applicationId}`,
  );
  const application = await getOwnedApplication(parsed.data.applicationId, userId);
  if (!application) return crmError("Application not found.");
  const supabase = await createClient();
  const query = parsed.data.noteId
    ? supabase
        .from("application_notes")
        .update({ body: parsed.data.body })
        .eq("id", parsed.data.noteId)
        .eq("application_id", application.id)
        .eq("user_id", userId)
    : supabase.from("application_notes").insert({
        user_id: userId,
        application_id: application.id,
        body: parsed.data.body,
      });
  const { error } = await query;

  if (error) return crmError("The note could not be saved.");
  revalidateApplication(application.id);
  return { status: "success", message: "Note saved." };
}

export async function deleteApplicationNoteAction(
  _previousState: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const parsed = z
    .object({ applicationId: z.string().uuid(), noteId: z.string().uuid() })
    .safeParse({
      applicationId: formData.get("applicationId"),
      noteId: formData.get("noteId"),
    });
  if (!parsed.success) return crmError("Invalid note.");
  const { userId } = await requireVerifiedIdentity(
    `/applications/${parsed.data.applicationId}`,
  );
  const supabase = await createClient();
  const { error } = await supabase
    .from("application_notes")
    .delete()
    .eq("id", parsed.data.noteId)
    .eq("application_id", parsed.data.applicationId)
    .eq("user_id", userId);

  if (error) return crmError("The note could not be removed.");
  revalidateApplication(parsed.data.applicationId);
  return { status: "success", message: "Note removed." };
}
