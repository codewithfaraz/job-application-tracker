import {
  buildSankeyData,
  CATEGORY_ORDER,
  TERMINAL_CATEGORIES,
} from "./sankey";
import type {
  AnalyticsApplicationInput,
  AnalyticsDataset,
  AnalyticsFilters,
  AnalyticsOverview,
  AnalyticsStageEventInput,
  ConversionMetrics,
  DashboardOverview,
  DistributionPoint,
  EffectivenessRow,
  PipelineCategoryCount,
  PipelineStageCount,
  RateMetric,
  ResolvedAnalyticsFilters,
  StageCategory,
  TimeBucket,
} from "./types";

const DAY_IN_MS = 86_400_000;
const RESPONSE_CATEGORIES = new Set<StageCategory>([
  "screening",
  "assessment",
  "interview",
  "offer",
  "rejected",
  "closed",
]);
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

type InternalFilters = {
  resolved: ResolvedAnalyticsFilters;
  fromMs: number | null;
  toMs: number | null;
  nowMs: number;
};

type ApplicationFacts = {
  application: AnalyticsApplicationInput;
  everCategories: Set<StageCategory>;
  firstAppliedAtMs: number | null;
  currentCategory: StageCategory | null;
  currentIsTerminal: boolean;
  hasResponse: boolean;
};

type EffectivenessAccumulator = Omit<
  EffectivenessRow,
  "responseRate" | "interviewRate" | "offerRate" | "acceptanceRate"
>;

function parseBoundary(
  value: Date | string | null | undefined,
  name: "from" | "to" | "now",
): Date | null {
  if (value === null || value === undefined) return null;

  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(
          DATE_ONLY.test(value)
            ? `${value}T${name === "to" ? "23:59:59.999" : "00:00:00.000"}Z`
            : value,
        );

  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Invalid analytics ${name} date.`);
  }
  return date;
}

function normalizeFilters(filters: AnalyticsFilters = {}): InternalFilters {
  const from = parseBoundary(filters.from, "from");
  const to = parseBoundary(filters.to, "to");
  const now = parseBoundary(filters.now ?? new Date(), "now");
  if (!now) throw new RangeError("Invalid analytics now date.");
  if (from && to && from.getTime() > to.getTime()) {
    throw new RangeError("Analytics 'from' must not be after 'to'.");
  }

  return {
    resolved: {
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
      includeArchived: filters.includeArchived ?? true,
      now: now.toISOString(),
    },
    fromMs: from?.getTime() ?? null,
    toMs: to?.getTime() ?? null,
    nowMs: now.getTime(),
  };
}

export function resolveAnalyticsFilters(
  filters: AnalyticsFilters = {},
): ResolvedAnalyticsFilters {
  return normalizeFilters(filters).resolved;
}

export function createRate(numerator: number, denominator: number): RateMetric {
  return {
    numerator,
    denominator,
    rate: denominator === 0 ? null : numerator / denominator,
  };
}

function compareEvents(
  left: AnalyticsStageEventInput,
  right: AnalyticsStageEventInput,
) {
  return (
    Date.parse(left.occurredAt) - Date.parse(right.occurredAt) ||
    Date.parse(left.createdAt) - Date.parse(right.createdAt) ||
    left.id.localeCompare(right.id)
  );
}

function buildFacts(dataset: AnalyticsDataset): ApplicationFacts[] {
  const stageById = new Map(dataset.stages.map((stage) => [stage.id, stage]));
  const eventsByApplication = new Map<string, AnalyticsStageEventInput[]>();
  for (const event of dataset.stageEvents) {
    const events = eventsByApplication.get(event.applicationId) ?? [];
    events.push(event);
    eventsByApplication.set(event.applicationId, events);
  }

  return dataset.applications.map((application) => {
    const events = [...(eventsByApplication.get(application.id) ?? [])].sort(
      compareEvents,
    );
    const everCategories = new Set<StageCategory>();
    let firstAppliedAtMs: number | null = null;

    for (const event of events) {
      const category = stageById.get(event.toStageId)?.category;
      if (!category) continue;
      everCategories.add(category);
      if (category === "applied" && firstAppliedAtMs === null) {
        const occurredAt = Date.parse(event.occurredAt);
        if (!Number.isNaN(occurredAt)) firstAppliedAtMs = occurredAt;
      }
    }

    const currentStage = stageById.get(application.currentStageId);
    return {
      application,
      everCategories,
      firstAppliedAtMs,
      currentCategory: currentStage?.category ?? null,
      currentIsTerminal: currentStage
        ? currentStage.isTerminal || TERMINAL_CATEGORIES.has(currentStage.category)
        : true,
      hasResponse: [...everCategories].some((category) =>
        RESPONSE_CATEGORIES.has(category),
      ),
    };
  });
}

function isInAppliedWindow(
  firstAppliedAtMs: number | null,
  filters: InternalFilters,
) {
  if (firstAppliedAtMs === null) return false;
  return (
    (filters.fromMs === null || firstAppliedAtMs >= filters.fromMs) &&
    (filters.toMs === null || firstAppliedAtMs <= filters.toMs)
  );
}

function isNoResponse(
  facts: ApplicationFacts,
  noResponseDays: number,
  nowMs: number,
) {
  if (
    facts.application.archivedAt !== null ||
    facts.currentCategory !== "applied" ||
    facts.firstAppliedAtMs === null ||
    facts.hasResponse
  ) {
    return false;
  }

  return nowMs - facts.firstAppliedAtMs >= noResponseDays * DAY_IN_MS;
}

function dimensionRows(
  facts: ApplicationFacts[],
  dimensions: Map<string, string>,
  getDimensionId: (application: AnalyticsApplicationInput) => string | null,
  unknownName: string,
): { distribution: DistributionPoint[]; effectiveness: EffectivenessRow[] } {
  const rows = new Map<string, EffectivenessAccumulator>();

  for (const item of facts) {
    const dimensionId = getDimensionId(item.application);
    const key = dimensionId ?? "__unknown__";
    const row = rows.get(key) ?? {
      dimensionId,
      name: (dimensionId && dimensions.get(dimensionId)) || unknownName,
      applications: 0,
      responses: 0,
      interviews: 0,
      offers: 0,
      accepted: 0,
    };
    row.applications += 1;
    if (item.hasResponse) row.responses += 1;
    if (item.everCategories.has("interview")) row.interviews += 1;
    if (item.everCategories.has("offer")) row.offers += 1;
    if (item.everCategories.has("accepted")) row.accepted += 1;
    rows.set(key, row);
  }

  const effectiveness = [...rows.values()]
    .map((row): EffectivenessRow => ({
      ...row,
      responseRate: createRate(row.responses, row.applications).rate,
      interviewRate: createRate(row.interviews, row.applications).rate,
      offerRate: createRate(row.offers, row.applications).rate,
      acceptanceRate: createRate(row.accepted, row.applications).rate,
    }))
    .sort(
      (left, right) =>
        right.applications - left.applications ||
        left.name.localeCompare(right.name),
    );

  return {
    effectiveness,
    distribution: effectiveness.map((row) => ({
      dimensionId: row.dimensionId,
      name: row.name,
      count: row.applications,
    })),
  };
}

function createCalendarFormatter(timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }
}

function localDateParts(timestamp: number, formatter: Intl.DateTimeFormat) {
  const parts = Object.fromEntries(
    formatter
      .formatToParts(timestamp)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function monthBucket(timestamp: number, formatter: Intl.DateTimeFormat) {
  const { year, month } = localDateParts(timestamp, formatter);
  return `${year}-${String(month).padStart(2, "0")}`;
}

function weekBucket(timestamp: number, formatter: Intl.DateTimeFormat) {
  const { year, month, day } = localDateParts(timestamp, formatter);
  const localCalendarDate = new Date(Date.UTC(year, month - 1, day));
  const daysSinceMonday = (localCalendarDate.getUTCDay() + 6) % 7;
  const monday = new Date(
    Date.UTC(year, month - 1, day),
  );
  monday.setUTCDate(monday.getUTCDate() - daysSinceMonday);
  return monday.toISOString().slice(0, 10);
}

function makeTimeBuckets(
  facts: ApplicationFacts[],
  bucketFor: (timestamp: number) => string,
): TimeBucket[] {
  const counts = new Map<string, number>();
  for (const item of facts) {
    if (item.firstAppliedAtMs === null) continue;
    const period = bucketFor(item.firstAppliedAtMs);
    counts.set(period, (counts.get(period) ?? 0) + 1);
  }
  return [...counts]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([period, count]) => ({ period, count }));
}

function makePipelineCounts(
  dataset: AnalyticsDataset,
  facts: ApplicationFacts[],
  filters: InternalFilters,
): {
  stages: PipelineStageCount[];
  categories: PipelineCategoryCount[];
} {
  const hasDateWindow = filters.fromMs !== null || filters.toMs !== null;
  const currentFacts = facts.filter(
    (item) =>
      item.application.archivedAt === null &&
      (!hasDateWindow || isInAppliedWindow(item.firstAppliedAtMs, filters)),
  );
  const stageCounts = new Map<string, number>();
  for (const item of currentFacts) {
    stageCounts.set(
      item.application.currentStageId,
      (stageCounts.get(item.application.currentStageId) ?? 0) + 1,
    );
  }

  const stages = dataset.stages
    .filter((stage) => stage.isActive || (stageCounts.get(stage.id) ?? 0) > 0)
    .map((stage) => ({
      stageId: stage.id,
      name: stage.name,
      category: stage.category,
      sortOrder: stage.sortOrder,
      count: stageCounts.get(stage.id) ?? 0,
    }))
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
    );

  const categoryCounts = new Map<StageCategory, number>();
  for (const stage of stages) {
    categoryCounts.set(
      stage.category,
      (categoryCounts.get(stage.category) ?? 0) + stage.count,
    );
  }

  return {
    stages,
    categories: CATEGORY_ORDER.map((category) => ({
      category,
      count: categoryCounts.get(category) ?? 0,
    })),
  };
}

function makeConversions(facts: ApplicationFacts[]): ConversionMetrics {
  const applications = facts.length;
  const responses = facts.filter((item) => item.hasResponse).length;
  const screened = facts.filter((item) =>
    item.everCategories.has("screening"),
  ).length;
  const interviewed = facts.filter((item) =>
    item.everCategories.has("interview"),
  ).length;
  const offered = facts.filter((item) => item.everCategories.has("offer"));
  const interviewToOffer = offered.filter((item) =>
    item.everCategories.has("interview"),
  ).length;
  const acceptedOffers = offered.filter((item) =>
    item.everCategories.has("accepted"),
  ).length;

  return {
    applicationToResponse: createRate(responses, applications),
    applicationToScreening: createRate(screened, applications),
    applicationToInterview: createRate(interviewed, applications),
    applicationToOffer: createRate(offered.length, applications),
    interviewToOffer: createRate(interviewToOffer, interviewed),
    offerToAccepted: createRate(acceptedOffers, offered.length),
  };
}

export function aggregateAnalytics(
  dataset: AnalyticsDataset,
  inputFilters: AnalyticsFilters = {},
): AnalyticsOverview {
  const filters = normalizeFilters(inputFilters);
  const facts = buildFacts(dataset);
  const cohort = facts.filter(
    (item) =>
      isInAppliedWindow(item.firstAppliedAtMs, filters) &&
      (filters.resolved.includeArchived ||
        item.application.archivedAt === null),
  );
  const safeNoResponseDays =
    Number.isFinite(dataset.noResponseDays) && dataset.noResponseDays > 0
      ? Math.trunc(dataset.noResponseDays)
      : 21;
  const calendarFormatter = createCalendarFormatter(dataset.timezone);
  const noResponseFacts = cohort.filter((item) =>
    isNoResponse(item, safeNoResponseDays, filters.nowMs),
  );
  const interviewed = cohort.filter((item) =>
    item.everCategories.has("interview"),
  ).length;
  const offers = cohort.filter((item) =>
    item.everCategories.has("offer"),
  ).length;
  const accepted = cohort.filter((item) =>
    item.everCategories.has("accepted"),
  ).length;
  const source = dimensionRows(
    cohort,
    new Map(dataset.sources.map((item) => [item.id, item.name])),
    (application) => application.sourceId,
    "Unknown source",
  );
  const channel = dimensionRows(
    cohort,
    new Map(dataset.channels.map((item) => [item.id, item.name])),
    (application) => application.channelId,
    "Unknown channel",
  );
  const includedApplicationIds = new Set(cohort.map((item) => item.application.id));
  const noResponseApplicationIds = new Set(
    noResponseFacts.map((item) => item.application.id),
  );

  return {
    filters: filters.resolved,
    timezone: dataset.timezone,
    noResponseDays: safeNoResponseDays,
    summary: {
      applications: cohort.length,
      responses: cohort.filter((item) => item.hasResponse).length,
      interviews: interviewed,
      offers,
      accepted,
      noResponse: noResponseFacts.length,
      activeApplications: cohort.filter(
        (item) =>
          item.application.archivedAt === null &&
          item.currentCategory !== null &&
          !item.currentIsTerminal,
      ).length,
    },
    conversions: makeConversions(cohort),
    sourceDistribution: source.distribution,
    sourceEffectiveness: source.effectiveness,
    channelDistribution: channel.distribution,
    channelEffectiveness: channel.effectiveness,
    applicationsOverTime: {
      weekly: makeTimeBuckets(cohort, (timestamp) =>
        weekBucket(timestamp, calendarFormatter),
      ),
      monthly: makeTimeBuckets(cohort, (timestamp) =>
        monthBucket(timestamp, calendarFormatter),
      ),
    },
    currentPipeline: makePipelineCounts(dataset, facts, filters),
    sankey: buildSankeyData({
      stages: dataset.stages,
      stageEvents: dataset.stageEvents,
      includedApplicationIds,
      noResponseApplicationIds,
    }),
    upcomingInterviews: [...dataset.upcomingInterviews]
      .filter((event) => Date.parse(event.startsAt) >= filters.nowMs)
      .sort(
        (left, right) =>
          Date.parse(left.startsAt) - Date.parse(right.startsAt) ||
          left.id.localeCompare(right.id),
      ),
  };
}

export function toDashboardOverview(
  overview: AnalyticsOverview,
): DashboardOverview {
  return {
    filters: overview.filters,
    timezone: overview.timezone,
    noResponseDays: overview.noResponseDays,
    summary: overview.summary,
    conversions: overview.conversions,
    sourceEffectiveness: overview.sourceEffectiveness,
    channelEffectiveness: overview.channelEffectiveness,
    applicationsOverTime: overview.applicationsOverTime,
    currentPipeline: overview.currentPipeline,
    sankey: overview.sankey,
    upcomingInterviews: overview.upcomingInterviews,
  };
}
