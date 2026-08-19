import "server-only";

import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import { requireAIConfig } from "./config";

/** The only provider-specific construction point in the application. */
export function getLanguageModel(): LanguageModel {
  const config = requireAIConfig();

  switch (config.provider) {
    case "openai":
      return createOpenAI({ apiKey: config.apiKey })(config.model);
  }
}
