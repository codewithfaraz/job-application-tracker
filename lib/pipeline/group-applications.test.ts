import { describe, expect, it } from "vitest";

import { groupApplicationsByStage } from "./group-applications";
import type { PipelineApplication } from "./types";

const application = (
  id: string,
  currentStageId: string,
  updatedAt: string,
): PipelineApplication => ({
  id,
  currentStageId,
  updatedAt,
  jobTitle: `Role ${id}`,
  companyName: `Company ${id}`,
  appliedAt: null,
  sourceName: "LinkedIn",
});

describe("groupApplicationsByStage", () => {
  const stages = [
    {
      id: "screening",
      name: "Screening",
      category: "screening" as const,
      sortOrder: 20,
      isTerminal: false,
      isActive: true,
    },
    {
      id: "saved",
      name: "Saved",
      category: "saved" as const,
      sortOrder: 10,
      isTerminal: false,
      isActive: true,
    },
    {
      id: "old",
      name: "Old stage",
      category: "closed" as const,
      sortOrder: 30,
      isTerminal: true,
      isActive: false,
    },
  ];

  it("orders stages and cards deterministically", () => {
    const grouped = groupApplicationsByStage(stages, [
      application("older", "saved", "2026-08-01T00:00:00Z"),
      application("newer", "saved", "2026-08-02T00:00:00Z"),
    ]);

    expect(grouped.map((stage) => stage.id)).toEqual(["saved", "screening"]);
    expect(grouped[0]?.applications.map((item) => item.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("keeps an inactive stage visible while it still contains a card", () => {
    const grouped = groupApplicationsByStage(stages, [
      application("legacy", "old", "2026-08-03T00:00:00Z"),
    ]);

    expect(grouped.some((stage) => stage.id === "old")).toBe(true);
  });
});
