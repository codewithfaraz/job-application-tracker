import "server-only";

import {
  APICallError,
  generateText,
  NoOutputGeneratedError,
  Output,
} from "ai";
import { z } from "zod";

import { createAIInputHash } from "@/lib/ai/cache-key";
import {
  AIConfigurationError,
  requireAIConfig,
} from "@/lib/ai/config";
import { AIServiceError } from "@/lib/ai/errors";
import { getLanguageModel } from "@/lib/ai/provider";
import type { createClient } from "@/lib/supabase/server";
import type { Enums, Json } from "@/types/database";

export type AIServiceContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
};

export type AIServiceResult<T> = {
  data: T;
  cached: boolean;
  runId: string;
};

type StructuredOperation<T extends object> = {
  applicationId: string | null;
  operation: Enums<"ai_operation">;
  promptVersion: string;
  schemaName: string;
  schemaDescription: string;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  hashInputs: Record<string, string>;
  maxOutputTokens: number;
  regenerate?: boolean;
};

function storageError() {
  return new AIServiceError(
    "storage",
    "AI results could not be stored. Try again.",
  );
}

function admissionError(error: { message?: string } | null) {
  const message = error?.message ?? "";

  if (message.includes("AI_DUPLICATE_PENDING")) {
    return new AIServiceError(
      "provider_rate_limit",
      "An identical AI request is already running. Wait for it to finish before trying again.",
    );
  }

  if (message.includes("AI_CONCURRENCY_LIMIT")) {
    return new AIServiceError(
      "provider_rate_limit",
      "Too many AI requests are already running for this account. Try again shortly.",
    );
  }

  if (message.includes("AI_USER_DAILY_LIMIT")) {
    return new AIServiceError(
      "provider_rate_limit",
      "This account has reached its daily AI request limit. Try again tomorrow.",
    );
  }

  if (
    message.includes("AI_RATE_LIMIT") ||
    message.includes("AI_GLOBAL_DAILY_LIMIT")
  ) {
    return new AIServiceError(
      "provider_rate_limit",
      "AI usage is temporarily limited. Try again later.",
    );
  }

  return storageError();
}

function publicFailure(error: unknown): AIServiceError {
  if (error instanceof AIServiceError) return error;

  if (error instanceof AIConfigurationError) {
    return new AIServiceError("disabled", error.message);
  }

  if (APICallError.isInstance(error)) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return new AIServiceError(
        "provider_auth",
        "AI credentials were rejected. Check the server configuration.",
      );
    }

    if (error.statusCode === 429) {
      return new AIServiceError(
        "provider_rate_limit",
        "The AI provider is rate-limited or out of quota. Try again later.",
      );
    }

    return new AIServiceError(
      "provider_unavailable",
      "The AI provider is temporarily unavailable. Try again later.",
    );
  }

  if (NoOutputGeneratedError.isInstance(error) || error instanceof z.ZodError) {
    return new AIServiceError(
      "invalid_output",
      "The AI response was incomplete or invalid. Try again.",
    );
  }

  if (
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  ) {
    return new AIServiceError(
      "provider_unavailable",
      "The AI request timed out. Try again.",
    );
  }

  return new AIServiceError(
    "provider_unavailable",
    "AI analysis is temporarily unavailable. Try again later.",
  );
}

function storedFailureMessage(error: AIServiceError) {
  switch (error.code) {
    case "provider_auth":
      return "AI provider authentication failed.";
    case "provider_rate_limit":
      return "AI provider rate limit or quota was reached.";
    case "invalid_output":
      return "AI provider returned invalid structured output.";
    case "storage":
      return "AI result storage failed.";
    default:
      return "AI provider request failed.";
  }
}

function tokenCount(value: number | undefined) {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= 2_147_483_647
    ? value
    : null;
}

function jsonValue(value: object): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

async function findCachedResult<T extends object>(
  context: AIServiceContext,
  operation: StructuredOperation<T>,
  provider: string,
  model: string,
  inputHash: string,
): Promise<AIServiceResult<T> | null> {
  let query = context.supabase
    .from("ai_runs")
    .select("id,result")
    .eq("user_id", context.userId)
    .eq("operation", operation.operation)
    .eq("provider", provider)
    .eq("model", model)
    .eq("input_hash", inputHash)
    .eq("prompt_version", operation.promptVersion)
    .eq("status", "succeeded")
    .order("completed_at", { ascending: false })
    .limit(5);

  query = operation.applicationId
    ? query.eq("application_id", operation.applicationId)
    : query.is("application_id", null);

  const result = await query;
  if (result.error) throw storageError();

  for (const run of result.data ?? []) {
    const parsed = operation.schema.safeParse(run.result);
    if (parsed.success) {
      return { data: parsed.data, cached: true, runId: run.id };
    }
  }

  return null;
}

async function finishFailedRun(
  context: AIServiceContext,
  runId: string,
  rpcCapability: string,
  failure: AIServiceError,
  inputTokens: number | null,
  outputTokens: number | null,
) {
  await context.supabase.rpc("complete_ai_run", {
    p_ai_run_id: runId,
    p_status: "failed",
    p_server_capability: rpcCapability,
    p_result: null,
    p_error_message: storedFailureMessage(failure),
    p_input_tokens: inputTokens,
    p_output_tokens: outputTokens,
  });
}

export async function runStructuredOperation<T extends object>(
  context: AIServiceContext,
  operation: StructuredOperation<T>,
): Promise<AIServiceResult<T>> {
  let config;

  try {
    config = requireAIConfig();
  } catch (error) {
    throw publicFailure(error);
  }

  const inputHash = createAIInputHash({
    operation: operation.operation,
    promptVersion: operation.promptVersion,
    inputs: operation.hashInputs,
  });

  if (!operation.regenerate) {
    const cached = await findCachedResult(
      context,
      operation,
      config.provider,
      config.model,
      inputHash,
    );
    if (cached) return cached;
  }

  const beginResult = await context.supabase.rpc("begin_ai_run", {
    p_application_id: operation.applicationId,
    p_operation: operation.operation,
    p_provider: config.provider,
    p_model: config.model,
    p_input_hash: inputHash,
    p_prompt_version: operation.promptVersion,
    p_server_capability: config.rpcCapability,
  });

  if (beginResult.error) throw admissionError(beginResult.error);
  if (!beginResult.data) throw storageError();

  const runId = beginResult.data.id;
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  try {
    const generated = await generateText({
      model: getLanguageModel(),
      system: operation.system,
      prompt: operation.prompt,
      output: Output.object({
        schema: operation.schema,
        name: operation.schemaName,
        description: operation.schemaDescription,
      }),
      maxOutputTokens: operation.maxOutputTokens,
      maxRetries: 1,
      timeout: { totalMs: 60_000 },
    });

    inputTokens = tokenCount(generated.usage.inputTokens);
    outputTokens = tokenCount(generated.usage.outputTokens);

    const parsed = operation.schema.safeParse(generated.output);
    if (!parsed.success) throw parsed.error;

    const completionResult = await context.supabase.rpc("complete_ai_run", {
      p_ai_run_id: runId,
      p_status: "succeeded",
      p_server_capability: config.rpcCapability,
      p_result: jsonValue(parsed.data),
      p_error_message: null,
      p_input_tokens: inputTokens,
      p_output_tokens: outputTokens,
    });

    if (completionResult.error) throw storageError();

    return { data: parsed.data, cached: false, runId };
  } catch (error) {
    const failure = publicFailure(error);

    try {
      await finishFailedRun(
        context,
        runId,
        config.rpcCapability,
        failure,
        inputTokens,
        outputTokens,
      );
    } catch {
      // The original safe error remains more useful. A provider/database outage
      // can leave a pending audit row, which is preferable to leaking details.
    }

    throw failure;
  }
}
