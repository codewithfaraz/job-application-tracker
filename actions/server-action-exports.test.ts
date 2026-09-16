// @vitest-environment node

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

// Next.js throws "A "use server" file can only export async functions" when a
// Server Action module is loaded with any other runtime export. Lint,
// typecheck, and build all pass in that case, so guard it here. Keep shared
// action state in lib/action-states.ts instead.
const actionsDirectory = path.dirname(fileURLToPath(import.meta.url));
const actionFiles = readdirSync(actionsDirectory).filter(
  (file) => file.endsWith(".ts") && !file.endsWith(".test.ts"),
);

describe("server action modules", () => {
  it.each(actionFiles)("%s exports only async functions and types", (file) => {
    const source = readFileSync(path.join(actionsDirectory, file), "utf8");
    if (!/^["']use server["']/.test(source)) return;

    const invalidExports = source
      .split(/\r?\n/)
      .filter((line) => line.startsWith("export "))
      .filter(
        (line) =>
          !/^export (default )?(async function |type |interface )/.test(line),
      );

    expect(invalidExports).toEqual([]);
  });
});
