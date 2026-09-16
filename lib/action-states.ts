// useActionState shapes and initial values for Server Actions. They live here
// because a "use server" file may only export async functions: Next.js throws
// at runtime when an action module exports anything else.

export type CompanyActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialCompanyActionState: CompanyActionState = { status: "idle" };

export type CrmActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialCrmActionState: CrmActionState = { status: "idle" };

export type TransitionApplicationState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const initialTransitionApplicationState: TransitionApplicationState = {
  status: "idle",
};

export type ResumeActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialResumeActionState: ResumeActionState = { status: "idle" };

export type SettingsActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialSettingsActionState: SettingsActionState = {
  status: "idle",
};
