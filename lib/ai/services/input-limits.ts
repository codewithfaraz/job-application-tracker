import { AIServiceError, type AIServiceErrorCode } from "@/lib/ai/errors";

export const MAX_AI_JOB_DESCRIPTION_LENGTH = 120_000;
export const MAX_AI_RESUME_TEXT_LENGTH = 80_000;
export const MAX_AI_COMBINED_INPUT_LENGTH = 160_000;

export function assertAIText(
  value: string,
  label: string,
  maximum: number,
  emptyCode: AIServiceErrorCode = "invalid_input",
) {
  if (!value.trim()) {
    throw new AIServiceError(emptyCode, `${label} is required for this AI feature.`);
  }

  if (value.length > maximum) {
    throw new AIServiceError(
      "invalid_input",
      `${label} is too long to analyze safely. Shorten it and try again.`,
    );
  }
}

export function assertCombinedInputLength(...values: string[]) {
  if (values.reduce((total, value) => total + value.length, 0) > MAX_AI_COMBINED_INPUT_LENGTH) {
    throw new AIServiceError(
      "invalid_input",
      "The combined job description and resume are too long to analyze safely.",
    );
  }
}
