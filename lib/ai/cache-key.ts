import { createHash } from "node:crypto";

export type AIInputHashParts = {
  operation: string;
  promptVersion: string;
  inputs: Record<string, string>;
};

/** Length-prefixed values prevent separator/collision ambiguity. */
export function createAIInputHash(parts: AIInputHashParts) {
  const canonicalInputs = Object.entries(parts.inputs)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => [name, value.length, value] as const);
  const canonical = JSON.stringify([
    "job-crm-ai-cache-v1",
    parts.operation,
    parts.promptVersion,
    canonicalInputs,
  ]);

  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
