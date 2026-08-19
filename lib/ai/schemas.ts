import { z } from "zod";

const shortText = z.string().trim().min(1).max(300);
const paragraph = z.string().trim().min(1).max(2_000);
const nullableShortText = shortText.nullable();
const stringList = (maximum: number) => z.array(shortText).max(maximum);

const salarySchema = z
  .object({
    min: z.number().finite().nonnegative().max(1_000_000_000).nullable(),
    max: z.number().finite().nonnegative().max(1_000_000_000).nullable(),
    currency: z.string().regex(/^[A-Z]{3}$/).nullable(),
    period: z.enum(["hour", "day", "month", "year"]).nullable(),
  })
  .strict()
  .superRefine((salary, context) => {
    if (
      salary.min !== null &&
      salary.max !== null &&
      salary.max < salary.min
    ) {
      context.addIssue({
        code: "custom",
        path: ["max"],
        message: "Maximum salary must be at least the minimum salary.",
      });
    }
  });

export const jobExtractionSchema = z
  .object({
    companyName: nullableShortText,
    jobTitle: nullableShortText,
    location: nullableShortText,
    workMode: z.enum(["remote", "hybrid", "onsite", "unknown"]),
    employmentType: z.enum([
      "full-time",
      "part-time",
      "contract",
      "internship",
      "temporary",
      "unknown",
    ]),
    seniority: nullableShortText,
    salary: salarySchema,
    requiredSkills: stringList(60),
    preferredSkills: stringList(60),
    responsibilities: stringList(60),
    requiredExperienceYears: z.number().finite().nonnegative().max(80).nullable(),
    educationRequirements: stringList(30),
    benefits: stringList(40),
    visaSponsorship: nullableShortText,
    keyRequirements: stringList(60),
    summary: z.string().trim().min(1).max(3_000).nullable(),
  })
  .strict();

const evidenceItemSchema = z
  .object({
    requirement: shortText,
    evidence: paragraph,
  })
  .strict();

const gapItemSchema = z
  .object({
    requirement: shortText,
    impact: paragraph,
    suggestedAction: paragraph,
  })
  .strict();

export const resumeComparisonSchema = z
  .object({
    matchStrength: z.enum(["Strong Match", "Moderate Match", "Weak Match"]),
    summary: z.string().trim().min(1).max(3_000),
    alignedStrengths: z.array(evidenceItemSchema).max(30),
    gaps: z.array(gapItemSchema).max(30),
    transferableSkills: stringList(40),
    keywordsToConsider: stringList(40),
    recommendations: stringList(30),
    caveats: stringList(20),
  })
  .strict();

const interviewFocusAreaSchema = z
  .object({
    topic: shortText,
    whyItMatters: paragraph,
    jobDescriptionEvidence: paragraph,
    preparationSteps: stringList(12),
  })
  .strict();

const interviewQuestionSchema = z
  .object({
    question: z.string().trim().min(1).max(600),
    whyItMayBeAsked: paragraph,
    answerFramework: z.string().trim().min(1).max(3_000),
  })
  .strict();

const storyPromptSchema = z
  .object({
    theme: shortText,
    prompt: paragraph,
    resumeEvidence: paragraph.nullable(),
  })
  .strict();

export const interviewPrepSchema = z
  .object({
    roleSummary: z.string().trim().min(1).max(3_000),
    focusAreas: z.array(interviewFocusAreaSchema).max(25),
    likelyQuestions: z.array(interviewQuestionSchema).max(30),
    questionsToAsk: stringList(25),
    storiesToPrepare: z.array(storyPromptSchema).max(20),
    technicalTopics: stringList(40),
    companySpecificUnknowns: stringList(20),
    dayOfChecklist: stringList(25),
  })
  .strict();

export const interviewPrepWithoutResumeSchema = interviewPrepSchema.superRefine(
  (preparation, context) => {
    preparation.storiesToPrepare.forEach((story, index) => {
      if (story.resumeEvidence !== null) {
        context.addIssue({
          code: "custom",
          path: ["storiesToPrepare", index, "resumeEvidence"],
          message: "Resume evidence must be null when no resume was supplied.",
        });
      }
    });
  },
);

export type JobExtraction = z.infer<typeof jobExtractionSchema>;
export type ResumeComparison = z.infer<typeof resumeComparisonSchema>;
export type InterviewPrep = z.infer<typeof interviewPrepSchema>;
