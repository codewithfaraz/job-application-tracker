import { describe, expect, it } from "vitest";

import { buildApplicationTimeline } from "./timeline";

describe("buildApplicationTimeline", () => {
  it("merges stage events, interviews, and notes in reverse chronological order", () => {
    const result = buildApplicationTimeline({
      stageHistory: [
        {
          id: "applied",
          occurredAt: "2026-08-01T09:00:00Z",
          notes: null,
          fromStage: null,
          toStage: { name: "Applied" },
        },
      ],
      events: [
        {
          id: "screen",
          startsAt: "2026-08-03T09:00:00Z",
          title: "Recruiter call",
          type: "recruiter_call",
          notes: null,
        },
      ],
      notes: [
        {
          id: "note",
          createdAt: "2026-08-02T09:00:00Z",
          body: "Asked about notice period.",
        },
      ],
    });

    expect(result.map((entry) => entry.kind)).toEqual([
      "event",
      "note",
      "stage",
    ]);
    expect(result[2]?.title).toBe("Started at Applied");
  });
});
