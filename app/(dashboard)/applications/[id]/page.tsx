import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplicationDetail } from "@/components/applications/application-detail";
import { Button } from "@/components/ui/button";
import { getApplicationAIHistory } from "@/lib/data/ai";
import { getApplicationDetail, getApplicationFormOptions } from "@/lib/data/applications";

export const metadata: Metadata = {
  title: "Application case file",
};

type ApplicationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ApplicationPage({ params }: ApplicationPageProps) {
  const { id } = await params;
  const [application, options, aiHistory] = await Promise.all([
    getApplicationDetail(id),
    getApplicationFormOptions(),
    getApplicationAIHistory(id),
  ]);

  if (!application) notFound();

  const detailOptions = options.stages.some(
    (stage) => stage.id === application.currentStage.id,
  )
    ? options
    : { ...options, stages: [...options.stages, application.currentStage] };

  return (
    <div className="mx-auto w-full max-w-[86rem]">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-5">
        <Link href="/applications"><ArrowLeft aria-hidden="true" /> Application files</Link>
      </Button>
      <ApplicationDetail
        application={application}
        options={detailOptions}
        aiHistory={aiHistory}
      />
    </div>
  );
}
