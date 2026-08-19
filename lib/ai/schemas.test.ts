import { Output } from "ai";
import { describe, expect, it } from "vitest";

import {
  interviewPrepSchema,
  interviewPrepWithoutResumeSchema,
  jobExtractionSchema,
  resumeComparisonSchema,
} from "./schemas";

const validJobExtraction = {
  companyName: "Example Corp",
  jobTitle: "Backend Engineer",
  location: null,
  workMode: "remote",
  employmentType: "full-time",
  seniority: "Senior",
  salary: { min: 100_000, max: 140_000, currency: "USD", period: "year" },
  requiredSkills: ["TypeScript"],
  preferredSkills: [],
  responsibilities: ["Build APIs"],
  requiredExperienceYears: 5,
  educationRequirements: [],
  benefits: [],
  visaSponsorship: null,
  keyRequirements: ["Production API experience"],
  summary: "Build and operate backend services.",
} as const;

const validResumeComparison = {
  matchStrength: "Moderate Match",
  summary: "The resume covers the core backend requirements.",
  alignedStrengths: [
    { requirement: "TypeScript", evidence: "The resume lists TypeScript API work." },
  ],
  gaps: [],
  transferableSkills: ["API design"],
  keywordsToConsider: ["PostgreSQL"],
  recommendations: ["Clarify the scale of the API work."],
  caveats: ["The resume does not mention the preferred cloud platform."],
} as const;

const validInterviewPrep = {
  roleSummary: "A backend role focused on APIs.",
  focusAreas: [
    {
      topic: "API reliability",
      whyItMatters: "The job description emphasizes production services.",
      jobDescriptionEvidence: "Production API ownership is required.",
      preparationSteps: ["Prepare a reliability example."],
    },
  ],
  likelyQuestions: [
    {
      question: "How do you make an API reliable?",
      whyItMayBeAsked: "Reliability is an explicit requirement.",
      answerFramework: "Explain context, constraints, action, and measured result.",
    },
  ],
  questionsToAsk: ["How is reliability measured?"],
  storiesToPrepare: [
    {
      theme: "Reliability",
      prompt: "Prepare an example of improving a service.",
      resumeEvidence: null,
    },
  ],
  technicalTopics: ["API observability"],
  companySpecificUnknowns: ["The current service scale is not stated."],
  dayOfChecklist: ["Review the job requirements."],
} as const;

describe("AI structured output schemas", () => {
  it("accepts grounded job extraction and rejects unknown fields", () => {
    expect(jobExtractionSchema.safeParse(validJobExtraction).success).toBe(true);
    expect(
      jobExtractionSchema.safeParse({ ...validJobExtraction, unsupported: true })
        .success,
    ).toBe(false);
  });

  it("rejects inverted salary ranges", () => {
    expect(
      jobExtractionSchema.safeParse({
        ...validJobExtraction,
        salary: { min: 140_000, max: 100_000, currency: "USD", period: "year" },
      }).success,
    ).toBe(false);
  });

  it("uses qualitative resume matching and rejects fake scores", () => {
    expect(resumeComparisonSchema.safeParse(validResumeComparison).success).toBe(
      true,
    );
    expect(
      resumeComparisonSchema.safeParse({
        ...validResumeComparison,
        score: 83.72,
      }).success,
    ).toBe(false);
  });

  it("requires null resume evidence in JD-only preparation", () => {
    expect(interviewPrepSchema.safeParse(validInterviewPrep).success).toBe(true);
    expect(
      interviewPrepWithoutResumeSchema.safeParse({
        ...validInterviewPrep,
        storiesToPrepare: [
          {
            ...validInterviewPrep.storiesToPrepare[0],
            resumeEvidence: "Invented resume evidence",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("converts every schema to the AI SDK v7 structured-output format", async () => {
    const responseFormats = await Promise.all([
      Output.object({ schema: jobExtractionSchema }).responseFormat,
      Output.object({ schema: resumeComparisonSchema }).responseFormat,
      Output.object({ schema: interviewPrepSchema }).responseFormat,
    ]);

    for (const responseFormat of responseFormats) {
      expect(responseFormat?.type).toBe("json");
    }
  });
});
