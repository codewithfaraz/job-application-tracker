import { describe, expect, it } from "vitest";

import { aggregateAnalytics } from "./aggregate";
import type {
  AnalyticsApplicationInput,
  AnalyticsDataset,
  AnalyticsStageEventInput,
  AnalyticsStageInput,
  StageCategory,
} from "./types";

function stage(
  id: string,
  category: StageCategory,
  sortOrder: number,
): AnalyticsStageInput {
  return {
    id,
    name: category,
    category,
    sortOrder,
    isTerminal: [
      "accepted",
      "rejected",
      "withdrawn",
      "ghosted",
      "closed",
    ].includes(category),
    isActive: true,
  };
}

const stages = [
  stage("saved", "saved", 10),
  stage("applied", "applied", 20),
  stage("screening", "screening", 30),
  stage("assessment", "assessment", 40),
  stage("interview", "interview", 50),
  stage("offer", "offer", 60),
  stage("accepted", "accepted", 70),
  stage("rejected", "rejected", 80),
  stage("withdrawn", "withdrawn", 90),
  stage("ghosted", "ghosted", 100),
  stage("closed", "closed", 110),
];

function application(
  id: string,
  currentStageId: string,
  sourceId: string,
  channelId: string,
  appliedAt: string | null,
): AnalyticsApplicationInput {
  return {
    id,
    currentStageId,
    sourceId,
    channelId,
    appliedAt,
    archivedAt: null,
    createdAt: "2026-07-01T00:00:00.000Z",
  };
}

function event(
  id: string,
  applicationId: string,
  fromStageId: string | null,
  toStageId: string,
  occurredAt: string,
): AnalyticsStageEventInput {
  return {
    id,
    applicationId,
    fromStageId,
    toStageId,
    occurredAt,
    createdAt: occurredAt,
  };
}

function dataset(
  applications: AnalyticsApplicationInput[],
  stageEvents: AnalyticsStageEventInput[],
): AnalyticsDataset {
  return {
    applications,
    stageEvents,
    stages,
    sources: [
      { id: "linkedin", name: "LinkedIn" },
      { id: "referral", name: "Referral" },
    ],
    channels: [
      { id: "careers", name: "Company careers page" },
      { id: "easy", name: "Easy Apply" },
    ],
    noResponseDays: 14,
    timezone: "UTC",
    upcomingInterviews: [],
  };
}

describe("aggregateAnalytics", () => {
  it("uses historical categories for ever-reached metrics and excludes saved-only records", () => {
    const input = dataset(
      [
        application("saved-only", "saved", "linkedin", "careers", null),
        application(
          "later-rejected",
          "rejected",
          "linkedin",
          "careers",
          "2026-07-01T00:00:00.000Z",
        ),
        application(
          "no-response",
          "applied",
          "linkedin",
          "careers",
          "2026-07-15T00:00:00.000Z",
        ),
        application(
          "ghosted-only",
          "ghosted",
          "referral",
          "careers",
          "2026-08-01T00:00:00.000Z",
        ),
        application(
          "accepted",
          "accepted",
          "referral",
          "easy",
          "2026-08-02T00:00:00.000Z",
        ),
      ],
      [
        event("s0", "saved-only", null, "saved", "2026-07-01T00:00:00.000Z"),
        event("r0", "later-rejected", null, "applied", "2026-07-01T00:00:00.000Z"),
        event("r1", "later-rejected", "applied", "screening", "2026-07-02T00:00:00.000Z"),
        event("r2", "later-rejected", "screening", "interview", "2026-07-03T00:00:00.000Z"),
        event("r3", "later-rejected", "interview", "rejected", "2026-07-04T00:00:00.000Z"),
        event("n0", "no-response", null, "applied", "2026-07-15T00:00:00.000Z"),
        event("g0", "ghosted-only", null, "applied", "2026-08-01T00:00:00.000Z"),
        event("g1", "ghosted-only", "applied", "ghosted", "2026-08-10T00:00:00.000Z"),
        event("a0", "accepted", null, "applied", "2026-08-02T00:00:00.000Z"),
        event("a1", "accepted", "applied", "screening", "2026-08-03T00:00:00.000Z"),
        event("a2", "accepted", "screening", "interview", "2026-08-04T00:00:00.000Z"),
        event("a3", "accepted", "interview", "offer", "2026-08-05T00:00:00.000Z"),
        event("a4", "accepted", "offer", "accepted", "2026-08-06T00:00:00.000Z"),
      ],
    );

    const overview = aggregateAnalytics(input, {
      now: "2026-08-18T12:00:00.000Z",
    });

    expect(overview.summary).toEqual({
      applications: 4,
      responses: 2,
      interviews: 2,
      offers: 1,
      accepted: 1,
      noResponse: 1,
      activeApplications: 1,
    });
    expect(overview.conversions.applicationToInterview).toEqual({
      numerator: 2,
      denominator: 4,
      rate: 0.5,
    });
    expect(overview.conversions.offerToAccepted).toEqual({
      numerator: 1,
      denominator: 1,
      rate: 1,
    });
  });

  it("derives no-response only for an old current Applied record with no response history", () => {
    const input = dataset(
      [
        application("old", "applied", "linkedin", "careers", "2026-07-01T00:00:00.000Z"),
        application("recent", "applied", "linkedin", "careers", "2026-08-10T00:00:00.000Z"),
        application("responded", "applied", "referral", "easy", "2026-07-01T00:00:00.000Z"),
      ],
      [
        event("old-0", "old", null, "applied", "2026-07-01T00:00:00.000Z"),
        event("recent-0", "recent", null, "applied", "2026-08-10T00:00:00.000Z"),
        event("response-0", "responded", null, "applied", "2026-07-01T00:00:00.000Z"),
        event("response-1", "responded", "applied", "screening", "2026-07-03T00:00:00.000Z"),
        event("response-2", "responded", "screening", "applied", "2026-07-04T00:00:00.000Z"),
      ],
    );

    const overview = aggregateAnalytics(input, {
      now: "2026-08-18T00:00:00.000Z",
    });

    expect(overview.summary.noResponse).toBe(1);
    expect(overview.sankey.links).toContainEqual({
      source: "applied",
      target: "no_response",
      value: 1,
    });
  });

  it("does not treat ghosted or withdrawn as responses unless a prior response stage exists", () => {
    const input = dataset(
      [
        application("ghost-only", "ghosted", "linkedin", "careers", "2026-08-01T00:00:00.000Z"),
        application("withdrawn-only", "withdrawn", "linkedin", "careers", "2026-08-01T00:00:00.000Z"),
        application("screen-then-ghost", "ghosted", "referral", "easy", "2026-08-01T00:00:00.000Z"),
      ],
      [
        event("g0", "ghost-only", null, "applied", "2026-08-01T00:00:00.000Z"),
        event("g1", "ghost-only", "applied", "ghosted", "2026-08-02T00:00:00.000Z"),
        event("w0", "withdrawn-only", null, "applied", "2026-08-01T00:00:00.000Z"),
        event("w1", "withdrawn-only", "applied", "withdrawn", "2026-08-02T00:00:00.000Z"),
        event("s0", "screen-then-ghost", null, "applied", "2026-08-01T00:00:00.000Z"),
        event("s1", "screen-then-ghost", "applied", "screening", "2026-08-02T00:00:00.000Z"),
        event("s2", "screen-then-ghost", "screening", "ghosted", "2026-08-03T00:00:00.000Z"),
      ],
    );

    const overview = aggregateAnalytics(input, {
      now: "2026-08-18T00:00:00.000Z",
    });

    expect(overview.summary.applications).toBe(3);
    expect(overview.summary.responses).toBe(1);
  });

  it("keeps source and application-channel distributions independent", () => {
    const input = dataset(
      [
        application("one", "applied", "linkedin", "careers", "2026-08-01T00:00:00.000Z"),
        application("two", "applied", "linkedin", "careers", "2026-08-02T00:00:00.000Z"),
        application("three", "applied", "referral", "easy", "2026-08-03T00:00:00.000Z"),
      ],
      [
        event("e1", "one", null, "applied", "2026-08-01T00:00:00.000Z"),
        event("e2", "two", null, "applied", "2026-08-02T00:00:00.000Z"),
        event("e3", "three", null, "applied", "2026-08-03T00:00:00.000Z"),
      ],
    );

    const overview = aggregateAnalytics(input, {
      now: "2026-08-10T00:00:00.000Z",
    });

    expect(overview.sourceDistribution).toEqual([
      { dimensionId: "linkedin", name: "LinkedIn", count: 2 },
      { dimensionId: "referral", name: "Referral", count: 1 },
    ]);
    expect(overview.channelDistribution).toEqual([
      {
        dimensionId: "careers",
        name: "Company careers page",
        count: 2,
      },
      { dimensionId: "easy", name: "Easy Apply", count: 1 },
    ]);
  });

  it("returns null rates with explicit zero numerators and denominators", () => {
    const overview = aggregateAnalytics(dataset([], []), {
      now: "2026-08-18T00:00:00.000Z",
    });

    for (const conversion of Object.values(overview.conversions)) {
      expect(conversion).toEqual({ numerator: 0, denominator: 0, rate: null });
    }
  });

  it("cohorts by the first Applied event rather than record creation or current stage", () => {
    const input = dataset(
      [
        application("inside", "rejected", "linkedin", "careers", "2026-08-03T00:00:00.000Z"),
        application("outside", "interview", "referral", "easy", "2026-07-30T00:00:00.000Z"),
      ],
      [
        event("i0", "inside", null, "saved", "2026-07-01T00:00:00.000Z"),
        event("i1", "inside", "saved", "applied", "2026-08-03T00:00:00.000Z"),
        event("i2", "inside", "applied", "rejected", "2026-08-04T00:00:00.000Z"),
        event("o0", "outside", null, "applied", "2026-07-30T00:00:00.000Z"),
        event("o1", "outside", "applied", "interview", "2026-08-05T00:00:00.000Z"),
      ],
    );

    const overview = aggregateAnalytics(input, {
      from: "2026-08-01",
      to: "2026-08-31",
      now: "2026-08-18T00:00:00.000Z",
    });

    expect(overview.summary.applications).toBe(1);
    expect(overview.summary.responses).toBe(1);
    expect(overview.summary.interviews).toBe(0);
    expect(overview.applicationsOverTime.monthly).toEqual([
      { period: "2026-08", count: 1 },
    ]);
  });
});
