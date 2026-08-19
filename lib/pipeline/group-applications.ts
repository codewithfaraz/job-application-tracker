import type {
  PipelineApplication,
  PipelineStage,
} from "@/lib/pipeline/types";

export type StageDefinition = Omit<PipelineStage, "applications">;

export function groupApplicationsByStage(
  stages: StageDefinition[],
  applications: PipelineApplication[],
): PipelineStage[] {
  const applicationsByStage = new Map<string, PipelineApplication[]>();

  for (const application of applications) {
    const current = applicationsByStage.get(application.currentStageId) ?? [];
    current.push(application);
    applicationsByStage.set(application.currentStageId, current);
  }

  return [...stages]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .filter(
      (stage) =>
        stage.isActive || (applicationsByStage.get(stage.id)?.length ?? 0) > 0,
    )
    .map((stage) => ({
      ...stage,
      applications: (applicationsByStage.get(stage.id) ?? []).sort((a, b) =>
        b.updatedAt.localeCompare(a.updatedAt),
      ),
    }));
}
