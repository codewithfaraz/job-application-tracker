import { describe, expect, it } from "vitest";

import { buildSankeyData } from "./sankey";
import type {
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
    name: id,
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

function event(
  id: string,
  applicationId: string,
  fromStageId: string | null,
  toStageId: string,
): AnalyticsStageEventInput {
  return {
    id,
    applicationId,
    fromStageId,
    toStageId,
    occurredAt: `2026-08-01T00:00:${id.padStart(2, "0")}.000Z`,
    createdAt: `2026-08-01T00:00:${id.padStart(2, "0")}.000Z`,
  };
}

describe("buildSankeyData", () => {
  it("aggregates forward duplicates and terminal exits", () => {
    const stages = [
      stage("applied", "applied", 10),
      stage("screening", "screening", 20),
      stage("interview-one", "interview", 30),
      stage("interview-two", "interview", 40),
      stage("rejected", "rejected", 50),
      stage("withdrawn", "withdrawn", 60),
    ];
    const stageEvents = [
      event("01", "a", null, "applied"),
      event("02", "a", "applied", "screening"),
      event("03", "b", "applied", "screening"),
      event("04", "a", "screening", "interview-one"),
      event("05", "a", "interview-one", "interview-one"),
      event("06", "a", "interview-two", "screening"),
      event("07", "a", "screening", "rejected"),
      event("08", "c", "rejected", "applied"),
      event("09", "d", "applied", "withdrawn"),
    ];

    const result = buildSankeyData({
      stages,
      stageEvents,
      includedApplicationIds: new Set(["a", "b", "c", "d"]),
      noResponseApplicationIds: new Set(["b"]),
    });

    expect(result.links).toContainEqual({
      source: "applied",
      target: "screening",
      value: 2,
    });
    expect(result.links).toContainEqual({
      source: "screening",
      target: "interview",
      value: 1,
    });
    expect(result.links).toContainEqual({
      source: "screening",
      target: "rejected",
      value: 1,
    });
    expect(result.links).toContainEqual({
      source: "applied",
      target: "withdrawn",
      value: 1,
    });
    expect(result.links).toContainEqual({
      source: "applied",
      target: "no_response",
      value: 1,
    });
    expect(result.excludedTransitions).toEqual([
      {
        source: "interview",
        target: "screening",
        value: 1,
        reason: "backward_or_correction",
      },
      {
        source: "interview",
        target: "interview",
        value: 1,
        reason: "same_category",
      },
      {
        source: "rejected",
        target: "applied",
        value: 1,
        reason: "terminal_reopened",
      },
    ]);
    expect(new Set(result.nodes.map((node) => node.id)).size).toBe(
      result.nodes.length,
    );
  });

  it("unrolls repeated normalized categories to retain the seeded forward flow", () => {
    const repeatedStages = [
      stage("screening", "screening", 30),
      stage("first-interview", "interview", 40),
      stage("assessment", "assessment", 50),
      stage("technical-interview", "interview", 60),
      stage("offer", "offer", 70),
    ];
    const result = buildSankeyData({
      stages: repeatedStages,
      stageEvents: [
        event("01", "a", "screening", "first-interview"),
        event("02", "a", "first-interview", "assessment"),
        event("03", "a", "assessment", "technical-interview"),
        event("04", "a", "technical-interview", "offer"),
      ],
      includedApplicationIds: new Set(["a"]),
      noResponseApplicationIds: new Set(),
    });

    expect(result.links).toEqual([
      { source: "screening", target: "interview", value: 1 },
      { source: "interview", target: "assessment", value: 1 },
      { source: "assessment", target: "interview_2", value: 1 },
      { source: "interview_2", target: "offer", value: 1 },
    ]);
    expect(result.excludedTransitions).toEqual([]);
    const nodePosition = new Map(
      result.nodes.map((node, index) => [node.id, index]),
    );
    expect(
      result.links.every(
        (link) =>
          (nodePosition.get(link.source) ?? -1) <
          (nodePosition.get(link.target) ?? -1),
      ),
    ).toBe(true);
  });

  it("ignores transitions outside the selected application cohort", () => {
    const result = buildSankeyData({
      stages: [
        stage("applied", "applied", 10),
        stage("screening", "screening", 20),
      ],
      stageEvents: [event("01", "outside", "applied", "screening")],
      includedApplicationIds: new Set(["inside"]),
      noResponseApplicationIds: new Set(["outside"]),
    });

    expect(result).toEqual({
      nodes: [],
      links: [],
      excludedTransitions: [],
    });
  });
});
