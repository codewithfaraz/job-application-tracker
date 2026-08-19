import "server-only";

import {
  evaluateAIConfiguration,
  type AIConfigurationStatus,
  type SupportedAIProvider,
} from "./config-policy";

export type AIConfig = {
  provider: SupportedAIProvider;
  model: string;
  apiKey: string;
  rpcCapability: string;
};

export class AIConfigurationError extends Error {
  readonly code: Exclude<AIConfigurationStatus, { enabled: true }>["code"];

  constructor(status: Exclude<AIConfigurationStatus, { enabled: true }>) {
    super(status.message);
    this.name = "AIConfigurationError";
    this.code = status.code;
  }
}

export function getAIConfigurationStatus(): AIConfigurationStatus {
  return evaluateAIConfiguration({
    AI_PROVIDER: process.env.AI_PROVIDER,
    AI_MODEL: process.env.AI_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AI_RPC_SECRET: process.env.AI_RPC_SECRET,
  });
}

export function getAIConfig(): AIConfig | null {
  const status = getAIConfigurationStatus();
  if (!status.enabled) return null;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const rpcCapability = process.env.AI_RPC_SECRET?.trim();
  if (!apiKey || !rpcCapability) return null;

  return {
    provider: status.provider,
    model: status.model,
    apiKey,
    rpcCapability,
  };
}

export function requireAIConfig(): AIConfig {
  const status = getAIConfigurationStatus();
  if (!status.enabled) throw new AIConfigurationError(status);

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const rpcCapability = process.env.AI_RPC_SECRET?.trim();
  if (!apiKey || !rpcCapability) {
    throw new AIConfigurationError({
      enabled: false,
      code: "missing_api_key",
      message: "AI features are not configured.",
    });
  }

  return {
    provider: status.provider,
    model: status.model,
    apiKey,
    rpcCapability,
  };
}
