import type { Enums } from "@/types/database";

export type StageCategory = Enums<"pipeline_stage_category">;
export type ApplicationEventType = Enums<"application_event_type">;

export type AnalyticsFilters = {
  /** Inclusive lower bound for the application's first Applied event. */
  from?: Date | string | null;
  /** Inclusive upper bound for the application's first Applied event. */
  to?: Date | string | null;
  /** Historical analytics include archived records by default. */
  includeArchived?: boolean;
  /** Injectable clock for deterministic rendering and tests. */
  now?: Date | string;
};

export type ResolvedAnalyticsFilters = {
  from: string | null;
  to: string | null;
  includeArchived: boolean;
  now: string;
};

export type AnalyticsApplicationInput = {
  id: string;
  sourceId: string | null;
  channelId: string | null;
  appliedAt: string | null;
  currentStageId: string;
  archivedAt: string | null;
  createdAt: string;
};

export type AnalyticsStageInput = {
  id: string;
  name: string;
  category: StageCategory;
  sortOrder: number;
  isTerminal: boolean;
  isActive: boolean;
};

export type AnalyticsStageEventInput = {
  id: string;
  applicationId: string;
  fromStageId: string | null;
  toStageId: string;
  occurredAt: string;
  createdAt: string;
};

export type AnalyticsDimensionInput = {
  id: string;
  name: string;
};

export type UpcomingInterview = {
  id: string;
  applicationId: string;
  type: ApplicationEventType;
  title: string;
  startsAt: string;
  endsAt: string | null;
  meetingUrl: string | null;
  location: string | null;
  applicationTitle: string;
  companyName: string;
};

export type AnalyticsDataset = {
  applications: AnalyticsApplicationInput[];
  stages: AnalyticsStageInput[];
  stageEvents: AnalyticsStageEventInput[];
  sources: AnalyticsDimensionInput[];
  channels: AnalyticsDimensionInput[];
  noResponseDays: number;
  timezone: string;
  upcomingInterviews: UpcomingInterview[];
};

export type RateMetric = {
  numerator: number;
  denominator: number;
  /** Decimal rate in [0, 1], or null when the denominator is zero. */
  rate: number | null;
};

export type AnalyticsSummary = {
  applications: number;
  responses: number;
  interviews: number;
  offers: number;
  accepted: number;
  noResponse: number;
  activeApplications: number;
};

export type ConversionMetrics = {
  applicationToResponse: RateMetric;
  applicationToScreening: RateMetric;
  applicationToInterview: RateMetric;
  applicationToOffer: RateMetric;
  interviewToOffer: RateMetric;
  offerToAccepted: RateMetric;
};

export type DistributionPoint = {
  dimensionId: string | null;
  name: string;
  count: number;
};

export type EffectivenessRow = {
  dimensionId: string | null;
  name: string;
  applications: number;
  responses: number;
  interviews: number;
  offers: number;
  accepted: number;
  responseRate: number | null;
  interviewRate: number | null;
  offerRate: number | null;
  acceptanceRate: number | null;
};

export type TimeBucket = {
  /** YYYY-MM for months and Monday's YYYY-MM-DD for weeks. */
  period: string;
  count: number;
};

export type PipelineStageCount = {
  stageId: string;
  name: string;
  category: StageCategory;
  sortOrder: number;
  count: number;
};

export type PipelineCategoryCount = {
  category: StageCategory;
  count: number;
};

export type SankeyNodeId =
  | StageCategory
  | "no_response"
  | `${StageCategory}_${number}`;

export type SankeyNode = {
  id: SankeyNodeId;
  name: string;
  category: StageCategory | "no_response";
  occurrence: number;
};

export type SankeyLink = {
  source: SankeyNodeId;
  target: SankeyNodeId;
  value: number;
};

export type ExcludedTransitionReason =
  | "same_category"
  | "backward_or_correction"
  | "terminal_reopened";

export type ExcludedTransition = {
  source: StageCategory;
  target: StageCategory;
  value: number;
  reason: ExcludedTransitionReason;
};

export type SankeyData = {
  nodes: SankeyNode[];
  links: SankeyLink[];
  excludedTransitions: ExcludedTransition[];
};

export type AnalyticsOverview = {
  filters: ResolvedAnalyticsFilters;
  timezone: string;
  noResponseDays: number;
  summary: AnalyticsSummary;
  conversions: ConversionMetrics;
  sourceDistribution: DistributionPoint[];
  sourceEffectiveness: EffectivenessRow[];
  channelDistribution: DistributionPoint[];
  channelEffectiveness: EffectivenessRow[];
  applicationsOverTime: {
    weekly: TimeBucket[];
    monthly: TimeBucket[];
  };
  currentPipeline: {
    stages: PipelineStageCount[];
    categories: PipelineCategoryCount[];
  };
  sankey: SankeyData;
  upcomingInterviews: UpcomingInterview[];
};

export type DashboardOverview = Pick<
  AnalyticsOverview,
  | "filters"
  | "timezone"
  | "noResponseDays"
  | "summary"
  | "conversions"
  | "applicationsOverTime"
  | "currentPipeline"
  | "sankey"
  | "upcomingInterviews"
> & {
  sourceEffectiveness: EffectivenessRow[];
  channelEffectiveness: EffectivenessRow[];
};
