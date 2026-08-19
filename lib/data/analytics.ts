import "server-only";

import {
  aggregateAnalytics,
  resolveAnalyticsFilters,
  toDashboardOverview,
} from "@/lib/analytics/aggregate";
import type {
  AnalyticsApplicationInput,
  AnalyticsDataset,
  AnalyticsFilters,
  AnalyticsOverview,
  AnalyticsStageEventInput,
  DashboardOverview,
  UpcomingInterview,
} from "@/lib/analytics/types";
import { requireVerifiedIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

const PAGE_SIZE = 1_000;
const MAX_PAGES = 100;
const INTERVIEW_EVENT_TYPES: Enums<"application_event_type">[] = [
  "recruiter_call",
  "screening",
  "technical_interview",
  "behavioral_interview",
  "system_design",
  "technical_assessment",
  "final_interview",
];

export class AnalyticsDataError extends Error {
  constructor(message = "Could not load analytics.") {
    super(message);
    this.name = "AnalyticsDataError";
  }
}

async function loadApplications(
  supabase: ServerSupabaseClient,
  userId: string,
): Promise<AnalyticsApplicationInput[]> {
  const applications: AnalyticsApplicationInput[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const result = await supabase
      .from("applications")
      .select(
        "id, discovery_source_id, application_channel_id, applied_at, current_stage_id, archived_at, created_at",
      )
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (result.error) throw new AnalyticsDataError();
    applications.push(
      ...result.data.map((application) => ({
        id: application.id,
        sourceId: application.discovery_source_id,
        channelId: application.application_channel_id,
        appliedAt: application.applied_at,
        currentStageId: application.current_stage_id,
        archivedAt: application.archived_at,
        createdAt: application.created_at,
      })),
    );
    if (result.data.length < PAGE_SIZE) return applications;
  }

  throw new AnalyticsDataError(
    "Analytics history is too large for request-time aggregation.",
  );
}

async function loadStageEvents(
  supabase: ServerSupabaseClient,
  userId: string,
): Promise<AnalyticsStageEventInput[]> {
  const events: AnalyticsStageEventInput[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE_SIZE;
    const result = await supabase
      .from("application_stage_events")
      .select(
        "id, application_id, from_stage_id, to_stage_id, occurred_at, created_at",
      )
      .eq("user_id", userId)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (result.error) throw new AnalyticsDataError();
    events.push(
      ...result.data.map((event) => ({
        id: event.id,
        applicationId: event.application_id,
        fromStageId: event.from_stage_id,
        toStageId: event.to_stage_id,
        occurredAt: event.occurred_at,
        createdAt: event.created_at,
      })),
    );
    if (result.data.length < PAGE_SIZE) return events;
  }

  throw new AnalyticsDataError(
    "Analytics history is too large for request-time aggregation.",
  );
}

async function loadDataset(
  supabase: ServerSupabaseClient,
  userId: string,
  now: string,
): Promise<AnalyticsDataset> {
  const [
    applications,
    stageEvents,
    profile,
    stages,
    sources,
    channels,
    upcoming,
  ] = await Promise.all([
    loadApplications(supabase, userId),
    loadStageEvents(supabase, userId),
    supabase
      .from("profiles")
      .select("no_response_days, timezone")
      .eq("id", userId)
      .single(),
    supabase
      .from("pipeline_stages")
      .select("id, name, category, sort_order, is_terminal, is_active")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .limit(PAGE_SIZE),
    supabase
      .from("application_sources")
      .select("id, name")
      .eq("user_id", userId)
      .order("name", { ascending: true })
      .limit(PAGE_SIZE),
    supabase
      .from("application_channels")
      .select("id, name")
      .eq("user_id", userId)
      .order("name", { ascending: true })
      .limit(PAGE_SIZE),
    supabase
      .from("application_events")
      .select(
        "id, application_id, type, title, starts_at, ends_at, meeting_url, location, application:applications!application_events_application_owner_fkey(job_title, company:companies!applications_company_owner_fkey(name))",
      )
      .eq("user_id", userId)
      .in("type", INTERVIEW_EVENT_TYPES)
      .is("completed_at", null)
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(20),
  ]);

  if (
    profile.error ||
    !profile.data ||
    stages.error ||
    sources.error ||
    channels.error ||
    upcoming.error
  ) {
    throw new AnalyticsDataError();
  }

  const upcomingInterviews: UpcomingInterview[] = upcoming.data.map(
    (event) => ({
      id: event.id,
      applicationId: event.application_id,
      type: event.type,
      title: event.title,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      meetingUrl: event.meeting_url,
      location: event.location,
      applicationTitle: event.application?.job_title ?? "Unknown role",
      companyName: event.application?.company?.name ?? "Unknown company",
    }),
  );

  return {
    applications,
    stageEvents,
    stages: stages.data.map((stage) => ({
      id: stage.id,
      name: stage.name,
      category: stage.category,
      sortOrder: stage.sort_order,
      isTerminal: stage.is_terminal,
      isActive: stage.is_active,
    })),
    sources: sources.data,
    channels: channels.data,
    noResponseDays: profile.data.no_response_days,
    timezone: profile.data.timezone,
    upcomingInterviews,
  };
}

async function loadAnalyticsOverview(
  returnTo: "/analytics" | "/dashboard",
  filters: AnalyticsFilters = {},
): Promise<AnalyticsOverview> {
  const { userId } = await requireVerifiedIdentity(returnTo);
  const effectiveFilters: AnalyticsFilters = {
    ...filters,
    now: filters.now ?? new Date(),
  };
  const resolved = resolveAnalyticsFilters(effectiveFilters);
  const supabase = await createClient();
  const dataset = await loadDataset(supabase, userId, resolved.now);
  return aggregateAnalytics(dataset, effectiveFilters);
}

/** Authenticated, tenant-filtered analytics DTO for the full analytics page. */
export async function getAnalyticsOverview(
  filters: AnalyticsFilters = {},
): Promise<AnalyticsOverview> {
  return loadAnalyticsOverview("/analytics", filters);
}

/** Authenticated, tenant-filtered analytics DTO for the dashboard. */
export async function getDashboardOverview(
  filters: AnalyticsFilters = {},
): Promise<DashboardOverview> {
  return toDashboardOverview(
    await loadAnalyticsOverview("/dashboard", filters),
  );
}
