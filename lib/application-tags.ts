import type { Enums } from "@/types/database";

/** Optional triage tags for an application, in display order. */
export const APPLICATION_TAGS = [
  "high_priority",
  "low_priority",
  "remote",
] as const satisfies readonly Enums<"application_tag">[];

export type ApplicationTag = (typeof APPLICATION_TAGS)[number];

export const APPLICATION_TAG_LABELS: Record<ApplicationTag, string> = {
  high_priority: "High priority",
  low_priority: "Low priority",
  remote: "Remote",
};
