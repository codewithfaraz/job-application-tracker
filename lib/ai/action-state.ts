import type {
  InterviewPrep,
  JobExtraction,
  ResumeComparison,
} from "./schemas";

export type AIArtifact =
  | { kind: "job-extraction"; data: JobExtraction }
  | { kind: "resume-comparison"; data: ResumeComparison }
  | { kind: "interview-prep"; data: InterviewPrep };

export type AIActionState = {
  status: "idle" | "disabled" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  artifact?: AIArtifact;
  cached?: boolean;
  runId?: string;
};

export const INITIAL_AI_ACTION_STATE: AIActionState = { status: "idle" };
