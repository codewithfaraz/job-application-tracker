export type AIServiceErrorCode =
  | "disabled"
  | "invalid_input"
  | "not_found"
  | "missing_job_description"
  | "missing_resume"
  | "provider_auth"
  | "provider_rate_limit"
  | "provider_unavailable"
  | "invalid_output"
  | "storage";

export class AIServiceError extends Error {
  readonly code: AIServiceErrorCode;

  constructor(code: AIServiceErrorCode, message: string) {
    super(message);
    this.name = "AIServiceError";
    this.code = code;
  }
}
