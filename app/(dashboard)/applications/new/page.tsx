import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { createApplicationAction } from "@/actions/applications";
import { ApplicationForm } from "@/components/applications/application-form";
import { Button } from "@/components/ui/button";
import { getAIConfigurationStatus } from "@/lib/ai/config";
import { getApplicationFormOptions } from "@/lib/data/applications";

export const metadata: Metadata = {
  title: "Add application",
};

export default async function NewApplicationPage() {
  const options = await getApplicationFormOptions();
  const aiAvailability = getAIConfigurationStatus();

  return (
    <div className="mx-auto w-full max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-5">
        <Link href="/applications"><ArrowLeft aria-hidden="true" /> Application files</Link>
      </Button>
      <header className="border-b border-border pb-7">
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cobalt">
          New case / Fast entry
        </p>
        <h1 className="mt-3 font-display text-4xl font-semibold leading-none text-evergreen-deep sm:text-5xl">
          Add an application
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Start with the company and role. Open more details only when you have them.
        </p>
      </header>

      <div className="mt-7">
        <ApplicationForm
          action={createApplicationAction}
          aiAvailability={aiAvailability}
          options={options}
        />
      </div>
    </div>
  );
}
