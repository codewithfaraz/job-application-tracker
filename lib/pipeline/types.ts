import type { Enums } from "@/types/database";

export type PipelineStageCategory = Enums<"pipeline_stage_category">;

export type PipelineApplication = {
  id: string;
  jobTitle: string;
  companyName: string;
  currentStageId: string;
  appliedAt: string | null;
  updatedAt: string;
  sourceName: string;
};

export type PipelineStage = {
  id: string;
  name: string;
  category: PipelineStageCategory;
  sortOrder: number;
  isTerminal: boolean;
  isActive: boolean;
  applications: PipelineApplication[];
};

export type PipelineBoard = {
  stages: PipelineStage[];
  totalApplications: number;
};
