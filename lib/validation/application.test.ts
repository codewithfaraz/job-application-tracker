import { describe, expect, it } from "vitest";

import {
  escapeLikePattern,
  normalizeApplicationListFilters,
  normalizeCompanyKey,
  normalizeJobTitleKey,
} from "@/lib/data/application-helpers";

import {
  createApplicationSchema,
  normalizeApplicationDateTime,
} from "./application";

const validApplication = {
  companyName: "Example Corp",
  jobTitle: "Backend Engineer",
  jobUrl: "https://example.com/jobs/backend",
  sourceId: "10000000-0000-4000-8000-000000000001",
  channelId: "10000000-0000-4000-8000-000000000002",
  stageId: "10000000-0000-4000-8000-000000000003",
  location: "Karachi",
  workMode: "remote",
  employmentType: "full-time",
  seniority: "Senior",
  salaryMin: "100000",
  salaryMax: "140000",
  salaryCurrency: "usd",
  salaryPeriod: "year",
  appliedAt: "2026-08-01",
  resumeId: "",
  rawJobDescription: "  Keep this exactly.\nSecond line.  ",
  notes: "A note",
  confirmDuplicate: "",
};

describe("application validation", () => {
  it("preserves the exact raw job description while normalizing metadata", () => {
    const parsed = createApplicationSchema.parse(validApplication);

    expect(parsed.rawJobDescription).toBe(
      "  Keep this exactly.\nSecond line.  ",
    );
    expect(parsed.salaryCurrency).toBe("USD");
    expect(parsed.confirmDuplicate).toBe(false);
  });

  it("only accepts safe HTTP job URLs", () => {
    const parsed = createApplicationSchema.safeParse({
      ...validApplication,
      jobUrl: "javascript:alert(1)",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path[0] === "jobUrl")).toBe(
        true,
      );
    }
  });

  it("rejects inverted salary ranges", () => {
    const parsed = createApplicationSchema.safeParse({
      ...validApplication,
      salaryMin: "150000",
      salaryMax: "100000",
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(
        parsed.error.issues.some((issue) => issue.path[0] === "salaryMax"),
      ).toBe(true);
    }
  });

  it("rejects invalid and materially future dates", () => {
    expect(normalizeApplicationDateTime("2025-02-29")).toBeNull();

    const parsed = createApplicationSchema.safeParse({
      ...validApplication,
      appliedAt: "2999-01-01",
    });

    expect(parsed.success).toBe(false);
  });

  it("normalizes valid date-only values deterministically", () => {
    expect(
      normalizeApplicationDateTime("2024-02-29"),
    ).toBe("2024-02-29T00:00:00.000Z");
  });
});

describe("application input helpers", () => {
  it("normalizes URL filters and clamps pagination", () => {
    expect(
      normalizeApplicationListFilters({
        q: "  backend   engineer ",
        stage: "not-a-uuid",
        archive: "unexpected",
        sort: "unexpected",
        page: "0",
        pageSize: "500",
      }),
    ).toEqual({
      q: "backend engineer",
      archive: "active",
      sort: "updated_desc",
      page: 1,
      pageSize: 100,
    });
  });

  it("escapes LIKE wildcards used by search", () => {
    expect(escapeLikePattern("100%_remote\\role")).toBe(
      "100\\%\\_remote\\\\role",
    );
  });

  it("compares duplicate company and title text without case or spacing noise", () => {
    expect(normalizeCompanyKey("  Example   CORP ")).toBe("example corp");
    expect(normalizeJobTitleKey("Backend   Engineer")).toBe(
      normalizeJobTitleKey(" backend engineer "),
    );
  });
});
