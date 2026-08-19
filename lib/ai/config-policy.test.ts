import { describe, expect, it } from "vitest";

import { evaluateAIConfiguration } from "./config-policy";

describe("AI configuration policy", () => {
  it("is cleanly disabled with no environment values", () => {
    expect(evaluateAIConfiguration({})).toEqual({
      enabled: false,
      code: "missing_provider",
      message: "AI features are not configured.",
    });
  });

  it("rejects providers that are not implemented", () => {
    expect(
      evaluateAIConfiguration({
        AI_PROVIDER: "anthropic",
        AI_MODEL: "some-model",
        OPENAI_API_KEY: "not-used-here",
        AI_RPC_SECRET: "not-used-here-either-but-long-enough",
      }),
    ).toMatchObject({ enabled: false, code: "unsupported_provider" });
  });

  it("returns enabled metadata without exposing the key", () => {
    const status = evaluateAIConfiguration({
      AI_PROVIDER: " openai ",
      AI_MODEL: "gpt-5-mini",
      OPENAI_API_KEY: "secret-test-key",
      AI_RPC_SECRET: "rpc-secret-test-key-that-is-at-least-32-chars",
    });

    expect(status).toEqual({
      enabled: true,
      provider: "openai",
      model: "gpt-5-mini",
    });
    expect(JSON.stringify(status)).not.toContain("secret-test-key");
    expect(JSON.stringify(status)).not.toContain("rpc-secret-test-key");
  });

  it("fails closed when the server-only RPC capability is absent or weak", () => {
    const base = {
      AI_PROVIDER: "openai",
      AI_MODEL: "gpt-5-mini",
      OPENAI_API_KEY: "secret-test-key",
    };

    expect(evaluateAIConfiguration(base)).toMatchObject({
      enabled: false,
      code: "missing_rpc_secret",
    });
    expect(
      evaluateAIConfiguration({ ...base, AI_RPC_SECRET: "too-short" }),
    ).toMatchObject({ enabled: false, code: "invalid_rpc_secret" });
  });
});
