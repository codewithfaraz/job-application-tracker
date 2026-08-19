import { describe, expect, it } from "vitest";

import { createAIInputHash } from "./cache-key";

describe("AI input cache keys", () => {
  it("is deterministic regardless of input property order", () => {
    const left = createAIInputHash({
      operation: "resume_comparison",
      promptVersion: "resume-comparison-v1",
      inputs: { jobDescription: "JD", resumeText: "Resume" },
    });
    const right = createAIInputHash({
      operation: "resume_comparison",
      promptVersion: "resume-comparison-v1",
      inputs: { resumeText: "Resume", jobDescription: "JD" },
    });

    expect(left).toBe(right);
    expect(left).toMatch(/^[a-f0-9]{64}$/);
  });

  it("changes for exact-content and prompt-version changes", () => {
    const base = {
      operation: "job_extraction",
      promptVersion: "job-extraction-v1",
      inputs: { jobDescription: "Exact text" },
    };

    expect(createAIInputHash(base)).not.toBe(
      createAIInputHash({
        ...base,
        inputs: { jobDescription: "Exact text " },
      }),
    );
    expect(createAIInputHash(base)).not.toBe(
      createAIInputHash({ ...base, promptVersion: "job-extraction-v2" }),
    );
  });
});
