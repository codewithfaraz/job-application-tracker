import "server-only";

import { groupApplicationsByStage } from "@/lib/pipeline/group-applications";
import type {
  PipelineApplication,
  PipelineBoard,
} from "@/lib/pipeline/types";
import { requireVerifiedIdentity } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export async function getPipelineBoard(): Promise<PipelineBoard> {
  const { userId } = await requireVerifiedIdentity("/pipeline");
  const supabase = await createClient();

  const [stagesResult, applicationsResult] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("id, name, category, sort_order, is_terminal, is_active")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("applications")
      .select(
        "id, job_title, current_stage_id, applied_at, updated_at, company:companies!applications_company_owner_fkey(name), source:application_sources!applications_discovery_source_owner_fkey(name)",
      )
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("updated_at", { ascending: false }),
  ]);

  if (stagesResult.error) {
    throw new Error("Could not load pipeline stages.");
  }

  if (applicationsResult.error) {
    throw new Error("Could not load applications for the pipeline.");
  }

  const applications: PipelineApplication[] = applicationsResult.data.map(
    (row) => ({
      id: row.id,
      jobTitle: row.job_title,
      currentStageId: row.current_stage_id,
      appliedAt: row.applied_at,
      updatedAt: row.updated_at,
      companyName: row.company?.name ?? "Unknown company",
      sourceName: row.source?.name ?? "Unknown source",
    }),
  );

  const stages = groupApplicationsByStage(
    stagesResult.data.map((stage) => ({
      id: stage.id,
      name: stage.name,
      category: stage.category,
      sortOrder: stage.sort_order,
      isTerminal: stage.is_terminal,
      isActive: stage.is_active,
    })),
    applications,
  );

  return { stages, totalApplications: applications.length };
}
