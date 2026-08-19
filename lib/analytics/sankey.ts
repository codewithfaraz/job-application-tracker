import type {
  AnalyticsStageEventInput,
  AnalyticsStageInput,
  ExcludedTransition,
  ExcludedTransitionReason,
  SankeyData,
  SankeyLink,
  SankeyNode,
  SankeyNodeId,
  StageCategory,
} from "./types";

export const CATEGORY_ORDER: readonly StageCategory[] = [
  "saved",
  "applied",
  "screening",
  "assessment",
  "interview",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
  "ghosted",
  "closed",
];

export const CATEGORY_LABELS: Record<StageCategory | "no_response", string> = {
  saved: "Saved",
  applied: "Applied",
  no_response: "No response",
  screening: "Screening",
  assessment: "Assessment",
  interview: "Interview",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  ghosted: "Ghosted",
  closed: "Closed",
};

export const TERMINAL_CATEGORIES = new Set<StageCategory>([
  "accepted",
  "rejected",
  "withdrawn",
  "ghosted",
  "closed",
]);

const categoryRank = new Map(
  CATEGORY_ORDER.map((category, index) => [category, index]),
);

type StageNode = {
  category: StageCategory;
  nodeId: SankeyNodeId;
  occurrence: number;
  rank: number;
};

export type BuildSankeyInput = {
  stages: AnalyticsStageInput[];
  stageEvents: AnalyticsStageEventInput[];
  includedApplicationIds: ReadonlySet<string>;
  noResponseApplicationIds: ReadonlySet<string>;
};

function buildStageNodes(stages: AnalyticsStageInput[]) {
  const sortedStages = [...stages].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.name.localeCompare(right.name) ||
      left.id.localeCompare(right.id),
  );
  const occurrences = new Map<StageCategory, number>();
  const nodesByStageId = new Map<string, StageNode>();
  const terminalRankStart = sortedStages.length + 1;

  sortedStages.forEach((stage, index) => {
    if (TERMINAL_CATEGORIES.has(stage.category)) {
      nodesByStageId.set(stage.id, {
        category: stage.category,
        nodeId: stage.category,
        occurrence: 1,
        rank:
          terminalRankStart + (categoryRank.get(stage.category) ?? index),
      });
      return;
    }

    const occurrence = (occurrences.get(stage.category) ?? 0) + 1;
    occurrences.set(stage.category, occurrence);
    nodesByStageId.set(stage.id, {
      category: stage.category,
      nodeId:
        occurrence === 1
          ? stage.category
          : `${stage.category}_${occurrence}`,
      occurrence,
      rank: index,
    });
  });

  return nodesByStageId;
}

function exclusionReason(
  source: StageNode,
  target: StageNode,
): ExcludedTransitionReason | null {
  if (source.nodeId === target.nodeId) return "same_category";
  if (TERMINAL_CATEGORIES.has(source.category)) return "terminal_reopened";

  // Terminal outcomes are sinks and may be reached from any non-terminal step.
  if (TERMINAL_CATEGORIES.has(target.category)) return null;
  return target.rank > source.rank ? null : "backward_or_correction";
}

function nodeFor(stageNode: StageNode): SankeyNode {
  return {
    id: stageNode.nodeId,
    name:
      stageNode.occurrence === 1
        ? CATEGORY_LABELS[stageNode.category]
        : `${CATEGORY_LABELS[stageNode.category]} ${stageNode.occurrence}`,
    category: stageNode.category,
    occurrence: stageNode.occurrence,
  };
}

/**
 * Converts immutable stage history into an acyclic, normalized Sankey.
 *
 * A category may legitimately appear more than once in a custom pipeline. In
 * that case it is unrolled into ordered occurrences (for example Interview and
 * Interview 2). This preserves the seeded Interview -> Assessment -> Interview
 * flow without creating a category-level cycle. Reverse/reopen transitions and
 * moves to the same normalized occurrence are reported separately.
 */
export function buildSankeyData({
  stages,
  stageEvents,
  includedApplicationIds,
  noResponseApplicationIds,
}: BuildSankeyInput): SankeyData {
  const stageNodes = buildStageNodes(stages);
  const linkCounts = new Map<string, SankeyLink>();
  const excludedCounts = new Map<string, ExcludedTransition>();
  const usedNodes = new Map<SankeyNodeId, SankeyNode>();
  const nodeRanks = new Map<SankeyNodeId, number>();
  const terminalExitApplications = new Set<string>();

  for (const event of stageEvents) {
    if (
      !includedApplicationIds.has(event.applicationId) ||
      event.fromStageId === null
    ) {
      continue;
    }

    const source = stageNodes.get(event.fromStageId);
    const target = stageNodes.get(event.toStageId);
    if (!source || !target) continue;

    const reason = exclusionReason(source, target);
    if (reason) {
      const key = `${source.category}\u0000${target.category}\u0000${reason}`;
      const existing = excludedCounts.get(key);
      if (existing) existing.value += 1;
      else {
        excludedCounts.set(key, {
          source: source.category,
          target: target.category,
          value: 1,
          reason,
        });
      }
      continue;
    }

    if (TERMINAL_CATEGORIES.has(target.category)) {
      terminalExitApplications.add(event.applicationId);
    }
    const key = `${source.nodeId}\u0000${target.nodeId}`;
    const existing = linkCounts.get(key);
    if (existing) existing.value += 1;
    else {
      linkCounts.set(key, {
        source: source.nodeId,
        target: target.nodeId,
        value: 1,
      });
    }
    usedNodes.set(source.nodeId, nodeFor(source));
    usedNodes.set(target.nodeId, nodeFor(target));
    nodeRanks.set(source.nodeId, source.rank);
    nodeRanks.set(target.nodeId, target.rank);
  }

  let derivedNoResponse = 0;
  for (const applicationId of noResponseApplicationIds) {
    if (
      includedApplicationIds.has(applicationId) &&
      !terminalExitApplications.has(applicationId)
    ) {
      derivedNoResponse += 1;
    }
  }
  if (derivedNoResponse > 0) {
    linkCounts.set("applied\u0000no_response", {
      source: "applied",
      target: "no_response",
      value: derivedNoResponse,
    });
    usedNodes.set("applied", {
      id: "applied",
      name: CATEGORY_LABELS.applied,
      category: "applied",
      occurrence: 1,
    });
    usedNodes.set("no_response", {
      id: "no_response",
      name: CATEGORY_LABELS.no_response,
      category: "no_response",
      occurrence: 1,
    });
    const appliedRank = [...stageNodes.values()].find(
      (stage) => stage.nodeId === "applied",
    )?.rank;
    nodeRanks.set("applied", appliedRank ?? 0);
    nodeRanks.set("no_response", (appliedRank ?? 0) + 0.5);
  }

  const rankFor = (nodeId: SankeyNodeId) =>
    nodeRanks.get(nodeId) ?? Number.MAX_SAFE_INTEGER;
  const links = [...linkCounts.values()].sort(
    (left, right) =>
      rankFor(left.source) - rankFor(right.source) ||
      rankFor(left.target) - rankFor(right.target),
  );

  return {
    nodes: [...usedNodes.values()].sort(
      (left, right) => rankFor(left.id) - rankFor(right.id),
    ),
    links,
    excludedTransitions: [...excludedCounts.values()].sort(
      (left, right) =>
        (categoryRank.get(left.source) ?? 0) -
          (categoryRank.get(right.source) ?? 0) ||
        (categoryRank.get(left.target) ?? 0) -
          (categoryRank.get(right.target) ?? 0) ||
        left.reason.localeCompare(right.reason),
    ),
  };
}
