export type SupportedAIProvider = "openai";

export type AIConfigurationStatus =
  | {
      enabled: true;
      provider: SupportedAIProvider;
      model: string;
    }
  | {
      enabled: false;
      code:
        | "missing_provider"
        | "unsupported_provider"
        | "missing_model"
        | "invalid_model"
        | "missing_api_key"
        | "invalid_api_key"
        | "missing_rpc_secret"
        | "invalid_rpc_secret";
      message: string;
    };

export type AIEnvironment = {
  AI_PROVIDER?: string;
  AI_MODEL?: string;
  OPENAI_API_KEY?: string;
  AI_RPC_SECRET?: string;
};

const MODEL_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,159}$/;

/** Returns only public-safe availability metadata; it never returns the key. */
export function evaluateAIConfiguration(
  environment: AIEnvironment,
): AIConfigurationStatus {
  const provider = environment.AI_PROVIDER?.trim().toLowerCase();
  const model = environment.AI_MODEL?.trim();
  const apiKey = environment.OPENAI_API_KEY?.trim();
  const rpcSecret = environment.AI_RPC_SECRET?.trim();

  if (!provider) {
    return {
      enabled: false,
      code: "missing_provider",
      message: "AI features are not configured.",
    };
  }

  if (provider !== "openai") {
    return {
      enabled: false,
      code: "unsupported_provider",
      message: "The configured AI provider is not supported yet.",
    };
  }

  if (!model) {
    return {
      enabled: false,
      code: "missing_model",
      message: "AI features are not configured.",
    };
  }

  if (!MODEL_PATTERN.test(model)) {
    return {
      enabled: false,
      code: "invalid_model",
      message: "The configured AI model name is invalid.",
    };
  }

  if (!apiKey) {
    return {
      enabled: false,
      code: "missing_api_key",
      message: "AI features are not configured.",
    };
  }

  if (apiKey.length < 8 || apiKey.length > 512) {
    return {
      enabled: false,
      code: "invalid_api_key",
      message: "The configured AI credentials are invalid.",
    };
  }

  if (!rpcSecret) {
    return {
      enabled: false,
      code: "missing_rpc_secret",
      message: "AI features are not configured.",
    };
  }

  if (rpcSecret.length < 32 || rpcSecret.length > 1024) {
    return {
      enabled: false,
      code: "invalid_rpc_secret",
      message: "The configured AI credentials are invalid.",
    };
  }

  return { enabled: true, provider: "openai", model };
}
