import "server-only";

import { requireVerifiedIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { Enums, Json, Tables } from "@/types/database";

import {
  escapeLikePattern,
  normalizeApplicationListFilters,
  type ApplicationListFilters,
} from "./application-helpers";

export type { ApplicationListFilters } from "./application-helpers";
export {
  APPLICATION_ARCHIVE_FILTERS,
  APPLICATION_LIST_SORTS,
  APPLICATION_WORK_MODES,
} from "./application-helpers";

type ApplicationRow = Tables<"applications">;
type ApplicationListRow = Pick<
  ApplicationRow,
  | "id"
  | "company_id"
  | "job_title"
  | "job_url"
  | "discovery_source_id"
  | "application_channel_id"
  | "location"
  | "work_mode"
  | "employment_type"
  | "seniority"
  | "salary_min"
  | "salary_max"
  | "salary_currency"
  | "salary_period"
  | "applied_at"
  | "current_stage_id"
  | "submitted_resume_id"
  | "archived_at"
  | "created_at"
  | "updated_at"
>;
type CompanyRow = Tables<"companies">;
type SourceRow = Tables<"application_sources">;
type ChannelRow = Tables<"application_channels">;
type StageRow = Tables<"pipeline_stages">;
type ResumeRow = Tables<"resumes">;

export type NamedOption = {
  id: string;
  name: string;
};

export type StageOption = NamedOption & {
  category: Enums<"pipeline_stage_category">;
  sortOrder: number;
  isTerminal: boolean;
};

export type ResumeOption = NamedOption & {
  originalFilename: string;
};

export type ApplicationFormOptions = {
  sources: NamedOption[];
  channels: NamedOption[];
  stages: StageOption[];
  resumes: ResumeOption[];
};

export type ApplicationListItem = {
  id: string;
  companyId: string;
  jobTitle: string;
  jobUrl: string | null;
  discoverySourceId: string;
  applicationChannelId: string;
  currentStageId: string;
  submittedResumeId: string | null;
  location: string | null;
  workMode: Enums<"work_mode"> | null;
  employmentType: Enums<"employment_type"> | null;
  seniority: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: Enums<"salary_period"> | null;
  appliedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  company: NamedOption;
  source: NamedOption;
  channel: NamedOption;
  currentStage: StageOption;
  submittedResume: ResumeOption | null;
};

export type ApplicationListResult = {
  items: ApplicationListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CompanyDetail = NamedOption & {
  website: string | null;
  industry: string | null;
  location: string | null;
  notes: string | null;
};

export type ApplicationStageHistoryEntry = {
  id: string;
  fromStageId: string | null;
  toStageId: string;
  occurredAt: string;
  notes: string | null;
  createdAt: string;
  fromStage: StageOption | null;
  toStage: StageOption;
};

export type ApplicationContact = {
  id: string;
  companyId: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationEvent = {
  id: string;
  type: Enums<"application_event_type">;
  title: string;
  startsAt: string;
  endsAt: string | null;
  meetingUrl: string | null;
  location: string | null;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationNoteEntry = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationDetail = Omit<ApplicationListItem, "company"> & {
  company: CompanyDetail;
  rawJobDescription: string;
  aiSummary: string | null;
  aiExtractedData: Json | null;
  notes: string | null;
  stageHistory: ApplicationStageHistoryEntry[];
  contacts: ApplicationContact[];
  events: ApplicationEvent[];
  noteEntries: ApplicationNoteEntry[];
};

export class ApplicationDataError extends Error {
  constructor(message = "Application data could not be loaded.") {
    super(message);
    this.name = "ApplicationDataError";
  }
}

function throwIfError(error: { message: string } | null, context: string) {
  if (error) {
    throw new ApplicationDataError(`${context} could not be loaded.`);
  }
}

function namedOption(row: { id: string; name: string }): NamedOption {
  return { id: row.id, name: row.name };
}

function stageOption(row: StageRow): StageOption {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    sortOrder: row.sort_order,
    isTerminal: row.is_terminal,
  };
}

function resumeOption(row: ResumeRow): ResumeOption {
  return {
    id: row.id,
    name: row.name,
    originalFilename: row.original_filename,
  };
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function missingNamedOption(id: string, name: string): NamedOption {
  return { id, name };
}

function missingStage(id: string): StageOption {
  return {
    id,
    name: "Unavailable stage",
    category: "closed",
    sortOrder: Number.MAX_SAFE_INTEGER,
    isTerminal: false,
  };
}

export async function getApplicationFormOptions(): Promise<ApplicationFormOptions> {
  const { userId } = await requireVerifiedIdentity("/applications/new");
  const supabase = await createClient();

  const [sourcesResult, channelsResult, stagesResult, resumesResult] =
    await Promise.all([
      supabase
        .from("application_sources")
        .select("id,name")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("application_channels")
        .select("id,name")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("pipeline_stages")
        .select("id,name,category,sort_order,is_terminal,created_at,is_active,updated_at,user_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("resumes")
        .select("id,name,original_filename")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("name", { ascending: true }),
    ]);

  throwIfError(sourcesResult.error, "Application sources");
  throwIfError(channelsResult.error, "Application channels");
  throwIfError(stagesResult.error, "Pipeline stages");
  throwIfError(resumesResult.error, "Resumes");

  return {
    sources: (sourcesResult.data ?? []).map(namedOption),
    channels: (channelsResult.data ?? []).map(namedOption),
    stages: (stagesResult.data ?? []).map(stageOption),
    resumes: (resumesResult.data ?? []).map((resume) => ({
      id: resume.id,
      name: resume.name,
      originalFilename: resume.original_filename,
    })),
  };
}

async function applicationIdsMatchingSearch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  search: string,
) {
  const pattern = `%${escapeLikePattern(search)}%`;
  const [titlesResult, companiesResult] = await Promise.all([
    supabase
      .from("applications")
      .select("id")
      .eq("user_id", userId)
      .ilike("job_title", pattern),
    supabase
      .from("companies")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", pattern),
  ]);

  throwIfError(titlesResult.error, "Application search");
  throwIfError(companiesResult.error, "Company search");

  const ids = new Set((titlesResult.data ?? []).map(({ id }) => id));
  const companyIds = (companiesResult.data ?? []).map(({ id }) => id);

  if (companyIds.length > 0) {
    const companyApplicationsResult = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", userId)
      .in("company_id", companyIds);

    throwIfError(companyApplicationsResult.error, "Company application search");
    for (const application of companyApplicationsResult.data ?? []) {
      ids.add(application.id);
    }
  }

  return [...ids];
}

function mapListItem(
  application: ApplicationListRow,
  companies: Map<string, CompanyRow>,
  sources: Map<string, SourceRow>,
  channels: Map<string, ChannelRow>,
  stages: Map<string, StageRow>,
  resumes: Map<string, ResumeRow>,
): ApplicationListItem {
  const company = companies.get(application.company_id);
  const source = sources.get(application.discovery_source_id);
  const channel = channels.get(application.application_channel_id);
  const stage = stages.get(application.current_stage_id);
  const resume = application.submitted_resume_id
    ? resumes.get(application.submitted_resume_id)
    : null;

  return {
    id: application.id,
    companyId: application.company_id,
    jobTitle: application.job_title,
    jobUrl: application.job_url,
    discoverySourceId: application.discovery_source_id,
    applicationChannelId: application.application_channel_id,
    currentStageId: application.current_stage_id,
    submittedResumeId: application.submitted_resume_id,
    location: application.location,
    workMode: application.work_mode,
    employmentType: application.employment_type,
    seniority: application.seniority,
    salaryMin: application.salary_min,
    salaryMax: application.salary_max,
    salaryCurrency: application.salary_currency,
    salaryPeriod: application.salary_period,
    appliedAt: application.applied_at,
    archivedAt: application.archived_at,
    createdAt: application.created_at,
    updatedAt: application.updated_at,
    company: company
      ? namedOption(company)
      : missingNamedOption(application.company_id, "Unavailable company"),
    source: source
      ? namedOption(source)
      : missingNamedOption(application.discovery_source_id, "Unavailable source"),
    channel: channel
      ? namedOption(channel)
      : missingNamedOption(
          application.application_channel_id,
          "Unavailable channel",
        ),
    currentStage: stage ? stageOption(stage) : missingStage(application.current_stage_id),
    submittedResume: resume ? resumeOption(resume) : null,
  };
}

export async function listApplications(
  filters: ApplicationListFilters = {},
): Promise<ApplicationListResult> {
  const normalized = normalizeApplicationListFilters(filters);
  const { userId } = await requireVerifiedIdentity("/applications");
  const supabase = await createClient();
  const matchingIds = normalized.q
    ? await applicationIdsMatchingSearch(supabase, userId, normalized.q)
    : null;

  if (matchingIds && matchingIds.length === 0) {
    return {
      items: [],
      total: 0,
      page: normalized.page,
      pageSize: normalized.pageSize,
      totalPages: 0,
    };
  }

  let query = supabase
    .from("applications")
    .select(
      "id,company_id,job_title,job_url,discovery_source_id,application_channel_id,location,work_mode,employment_type,seniority,salary_min,salary_max,salary_currency,salary_period,applied_at,current_stage_id,submitted_resume_id,archived_at,created_at,updated_at",
      { count: "exact" },
    )
    .eq("user_id", userId);

  if (matchingIds) query = query.in("id", matchingIds);
  if (normalized.stage) query = query.eq("current_stage_id", normalized.stage);
  if (normalized.source) {
    query = query.eq("discovery_source_id", normalized.source);
  }
  if (normalized.channel) {
    query = query.eq("application_channel_id", normalized.channel);
  }
  if (normalized.workMode) query = query.eq("work_mode", normalized.workMode);

  if (normalized.archive === "active") {
    query = query.is("archived_at", null);
  } else if (normalized.archive === "archived") {
    query = query.not("archived_at", "is", null);
  }

  switch (normalized.sort) {
    case "created_desc":
      query = query.order("created_at", { ascending: false });
      break;
    case "applied_desc":
      query = query.order("applied_at", {
        ascending: false,
        nullsFirst: false,
      });
      break;
    case "title_asc":
      query = query.order("job_title", { ascending: true });
      break;
    default:
      query = query.order("updated_at", { ascending: false });
  }

  const from = (normalized.page - 1) * normalized.pageSize;
  const to = from + normalized.pageSize - 1;
  const applicationsResult = await query
    .order("id", { ascending: true })
    .range(from, to);

  throwIfError(applicationsResult.error, "Applications");

  const applications = applicationsResult.data ?? [];
  const total = applicationsResult.count ?? 0;

  if (applications.length === 0) {
    return {
      items: [],
      total,
      page: normalized.page,
      pageSize: normalized.pageSize,
      totalPages: total === 0 ? 0 : Math.ceil(total / normalized.pageSize),
    };
  }

  const companyIds = unique(applications.map(({ company_id }) => company_id));
  const sourceIds = unique(
    applications.map(({ discovery_source_id }) => discovery_source_id),
  );
  const channelIds = unique(
    applications.map(({ application_channel_id }) => application_channel_id),
  );
  const stageIds = unique(
    applications.map(({ current_stage_id }) => current_stage_id),
  );
  const resumeIds = unique(
    applications.flatMap(({ submitted_resume_id }) =>
      submitted_resume_id ? [submitted_resume_id] : [],
    ),
  );

  const [companiesResult, sourcesResult, channelsResult, stagesResult] =
    await Promise.all([
      supabase
        .from("companies")
        .select("*")
        .eq("user_id", userId)
        .in("id", companyIds),
      supabase
        .from("application_sources")
        .select("*")
        .eq("user_id", userId)
        .in("id", sourceIds),
      supabase
        .from("application_channels")
        .select("*")
        .eq("user_id", userId)
        .in("id", channelIds),
      supabase
        .from("pipeline_stages")
        .select("*")
        .eq("user_id", userId)
        .in("id", stageIds),
    ]);
  const resumesResult =
    resumeIds.length > 0
      ? await supabase
          .from("resumes")
          .select("*")
          .eq("user_id", userId)
          .in("id", resumeIds)
      : { data: [] as ResumeRow[], error: null };

  throwIfError(companiesResult.error, "Companies");
  throwIfError(sourcesResult.error, "Application sources");
  throwIfError(channelsResult.error, "Application channels");
  throwIfError(stagesResult.error, "Pipeline stages");
  throwIfError(resumesResult.error, "Resumes");

  const companies = new Map(
    (companiesResult.data ?? []).map((row) => [row.id, row]),
  );
  const sources = new Map(
    (sourcesResult.data ?? []).map((row) => [row.id, row]),
  );
  const channels = new Map(
    (channelsResult.data ?? []).map((row) => [row.id, row]),
  );
  const stages = new Map(
    (stagesResult.data ?? []).map((row) => [row.id, row]),
  );
  const resumes = new Map(
    (resumesResult.data ?? []).map((row) => [row.id, row]),
  );

  return {
    items: applications.map((application) =>
      mapListItem(application, companies, sources, channels, stages, resumes),
    ),
    total,
    page: normalized.page,
    pageSize: normalized.pageSize,
    totalPages: total === 0 ? 0 : Math.ceil(total / normalized.pageSize),
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getApplicationDetail(
  id: string,
): Promise<ApplicationDetail | null> {
  const { userId } = await requireVerifiedIdentity(`/applications/${encodeURIComponent(id)}`);
  if (!UUID_PATTERN.test(id)) return null;

  const supabase = await createClient();
  const applicationResult = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  throwIfError(applicationResult.error, "Application");
  const application = applicationResult.data;
  if (!application) return null;

  const [
    companyResult,
    sourceResult,
    channelResult,
    currentStageResult,
    resumeResult,
    historyResult,
    contactsResult,
    eventsResult,
    notesResult,
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("*")
      .eq("id", application.company_id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("application_sources")
      .select("*")
      .eq("id", application.discovery_source_id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("application_channels")
      .select("*")
      .eq("id", application.application_channel_id)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("pipeline_stages")
      .select("*")
      .eq("id", application.current_stage_id)
      .eq("user_id", userId)
      .maybeSingle(),
    application.submitted_resume_id
      ? supabase
          .from("resumes")
          .select("*")
          .eq("id", application.submitted_resume_id)
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null as ResumeRow | null, error: null }),
    supabase
      .from("application_stage_events")
      .select("*")
      .eq("application_id", id)
      .eq("user_id", userId)
      .order("occurred_at", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("contacts")
      .select("*")
      .eq("application_id", id)
      .eq("user_id", userId)
      .order("name", { ascending: true }),
    supabase
      .from("application_events")
      .select("*")
      .eq("application_id", id)
      .eq("user_id", userId)
      .order("starts_at", { ascending: true }),
    supabase
      .from("application_notes")
      .select("*")
      .eq("application_id", id)
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  throwIfError(companyResult.error, "Company");
  throwIfError(sourceResult.error, "Application source");
  throwIfError(channelResult.error, "Application channel");
  throwIfError(currentStageResult.error, "Pipeline stage");
  throwIfError(resumeResult.error, "Resume");
  throwIfError(historyResult.error, "Stage history");
  throwIfError(contactsResult.error, "Contacts");
  throwIfError(eventsResult.error, "Events");
  throwIfError(notesResult.error, "Notes");

  const history = historyResult.data ?? [];
  const historyStageIds = unique(
    history.flatMap(({ from_stage_id, to_stage_id }) => [
      ...(from_stage_id ? [from_stage_id] : []),
      to_stage_id,
    ]),
  );
  const historyStagesResult =
    historyStageIds.length > 0
      ? await supabase
          .from("pipeline_stages")
          .select("*")
          .eq("user_id", userId)
          .in("id", historyStageIds)
      : { data: [] as StageRow[], error: null };

  throwIfError(historyStagesResult.error, "History stages");

  const company = companyResult.data;
  const source = sourceResult.data;
  const channel = channelResult.data;
  const currentStage = currentStageResult.data;
  const historyStages = new Map(
    (historyStagesResult.data ?? []).map((row) => [row.id, row]),
  );
  const base = mapListItem(
    application,
    new Map(company ? [[company.id, company]] : []),
    new Map(source ? [[source.id, source]] : []),
    new Map(channel ? [[channel.id, channel]] : []),
    new Map(currentStage ? [[currentStage.id, currentStage]] : []),
    new Map(resumeResult.data ? [[resumeResult.data.id, resumeResult.data]] : []),
  );

  return {
    ...base,
    company: company
      ? {
          id: company.id,
          name: company.name,
          website: company.website,
          industry: company.industry,
          location: company.location,
          notes: company.notes,
        }
      : {
          id: application.company_id,
          name: "Unavailable company",
          website: null,
          industry: null,
          location: null,
          notes: null,
        },
    rawJobDescription: application.raw_job_description,
    aiSummary: application.ai_summary,
    aiExtractedData: application.ai_extracted_data,
    notes: application.notes,
    stageHistory: history.map((entry) => {
      const fromStage = entry.from_stage_id
        ? historyStages.get(entry.from_stage_id)
        : null;
      const toStage = historyStages.get(entry.to_stage_id);

      return {
        id: entry.id,
        fromStageId: entry.from_stage_id,
        toStageId: entry.to_stage_id,
        occurredAt: entry.occurred_at,
        notes: entry.notes,
        createdAt: entry.created_at,
        fromStage: fromStage ? stageOption(fromStage) : null,
        toStage: toStage ? stageOption(toStage) : missingStage(entry.to_stage_id),
      };
    }),
    contacts: (contactsResult.data ?? []).map((contact) => ({
      id: contact.id,
      companyId: contact.company_id,
      name: contact.name,
      role: contact.role,
      email: contact.email,
      phone: contact.phone,
      linkedinUrl: contact.linkedin_url,
      notes: contact.notes,
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
    })),
    events: (eventsResult.data ?? []).map((event) => ({
      id: event.id,
      type: event.type,
      title: event.title,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      meetingUrl: event.meeting_url,
      location: event.location,
      notes: event.notes,
      completedAt: event.completed_at,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
    })),
    noteEntries: (notesResult.data ?? []).map((note) => ({
      id: note.id,
      body: note.body,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
    })),
  };
}
