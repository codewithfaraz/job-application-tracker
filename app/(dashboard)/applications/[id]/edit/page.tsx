import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateApplicationAction } from "@/actions/applications";
import { ApplicationForm } from "@/components/applications/application-form";
import { Button } from "@/components/ui/button";
import { getAIConfigurationStatus } from "@/lib/ai/config";
import {
  getApplicationDetail,
  getApplicationFormOptions,
} from "@/lib/data/applications";

export const metadata: Metadata = {
  title: "Edit application",
};

type EditApplicationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditApplicationPage({ params }: EditApplicationPageProps) {
  const { id } = await params;
  const [application, options] = await Promise.all([
    getApplicationDetail(id),
    getApplicationFormOptions(),
  ]);

  if (!application) notFound();

  const aiAvailability = getAIConfigurationStatus();

  const editOptions = options.stages.some(
    (stage) => stage.id === application.currentStage.id,
  )
    ? options
    : { ...options, stages: [...options.stages, application.currentStage] };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-5">
        <Link href={`/applications/${application.id}`}><ArrowLeft aria-hidden="true" /> Back to case file</Link>
      </Button>
      <header className="border-b border-border pb-7">
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cobalt">
          Edit case / {application.company.name}
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-none text-evergreen-deep sm:text-5xl">
          Edit application
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Correct details without losing the original description or application history.
        </p>
      </header>

      <div className="mt-7">
        <ApplicationForm
          mode="edit"
          action={updateApplicationAction}
          aiAvailability={aiAvailability}
          options={editOptions}
          initialValues={{
            id: application.id,
            companyName: application.company.name,
            jobTitle: application.jobTitle,
            jobUrl: application.jobUrl ?? "",
            sourceId: application.discoverySourceId,
            channelId: application.applicationChannelId,
            stageId: application.currentStageId,
            location: application.location ?? "",
            workMode: application.workMode ?? "",
            employmentType: application.employmentType ?? "",
            seniority: application.seniority ?? "",
            salaryMin: application.salaryMin?.toString() ?? "",
            salaryMax: application.salaryMax?.toString() ?? "",
            salaryCurrency: application.salaryCurrency ?? "",
            salaryPeriod: application.salaryPeriod ?? "",
            appliedAt: application.appliedAt?.slice(0, 10) ?? "",
            resumeId: application.submittedResumeId ?? "",
            rawJobDescription: application.rawJobDescription,
            notes: application.notes ?? "",
          }}
        />
      </div>
    </div>
  );
}
