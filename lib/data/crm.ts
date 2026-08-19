import "server-only";

import { requireVerifiedIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type ApplicationCrmData = {
  contacts: Tables<"contacts">[];
  events: Tables<"application_events">[];
  notes: Tables<"application_notes">[];
};

export async function getApplicationCrmData(
  applicationId: string,
): Promise<ApplicationCrmData> {
  const { userId } = await requireVerifiedIdentity(
    `/applications/${applicationId}`,
  );
  const supabase = await createClient();

  const ownership = await supabase
    .from("applications")
    .select("id")
    .eq("id", applicationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (ownership.error || !ownership.data) throw new Error("Application not found.");

  const [contacts, events, notes] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .eq("user_id", userId)
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("application_events")
      .select("*")
      .eq("user_id", userId)
      .eq("application_id", applicationId)
      .order("starts_at", { ascending: true }),
    supabase
      .from("application_notes")
      .select("*")
      .eq("user_id", userId)
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false }),
  ]);

  if (contacts.error || events.error || notes.error) {
    throw new Error("Could not load application activity.");
  }

  return {
    contacts: contacts.data,
    events: events.data,
    notes: notes.data,
  };
}

export type UpcomingEvent = Pick<
  Tables<"application_events">,
  | "id"
  | "application_id"
  | "type"
  | "title"
  | "starts_at"
  | "ends_at"
  | "meeting_url"
  | "location"
  | "notes"
> & {
  applicationTitle: string;
  companyName: string;
};

export async function getCalendarData(): Promise<{
  timezone: string;
  events: UpcomingEvent[];
}> {
  const { userId } = await requireVerifiedIdentity("/calendar");
  const supabase = await createClient();
  const [profile, events] = await Promise.all([
    supabase.from("profiles").select("timezone").eq("id", userId).single(),
    supabase
      .from("application_events")
      .select(
        "id, application_id, type, title, starts_at, ends_at, meeting_url, location, notes, application:applications!application_events_application_owner_fkey(job_title, company:companies!applications_company_owner_fkey(name))",
      )
      .eq("user_id", userId)
      .is("completed_at", null)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(100),
  ]);

  if (profile.error || events.error) throw new Error("Could not load interviews.");

  return {
    timezone: profile.data.timezone,
    events: events.data.map((event) => ({
      id: event.id,
      application_id: event.application_id,
      type: event.type,
      title: event.title,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      meeting_url: event.meeting_url,
      location: event.location,
      notes: event.notes,
      applicationTitle: event.application?.job_title ?? "Unknown role",
      companyName: event.application?.company?.name ?? "Unknown company",
    })),
  };
}
