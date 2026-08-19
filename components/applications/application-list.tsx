import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  MapPin,
  Plus,
} from "lucide-react";
import Link from "next/link";

import { RouteSpine } from "@/components/layout/route-spine";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import type { VariantProps } from "class-variance-authority";

type ApplicationListItemView = {
  id: string;
  jobTitle: string;
  jobUrl: string | null;
  location: string | null;
  workMode: string | null;
  employmentType: string | null;
  appliedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  company: { id: string; name: string };
  source: { id: string; name: string };
  channel: { id: string; name: string };
  currentStage: { id: string; name: string; category: string };
  submittedResume: { id: string; name: string; originalFilename?: string } | null;
};

type ApplicationListProps = {
  items: ApplicationListItemView[];
  hasFilters?: boolean;
};

function ApplicationList({ items, hasFilters = false }: ApplicationListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        eyebrow={hasFilters ? "No matching files" : "The cabinet is empty"}
        title={hasFilters ? "Try a wider search" : "Add your first application"}
        description={
          hasFilters
            ? "No applications match these filters. Clear them and try another company or role."
            : "Capture the company and role now. The rest of the case file can grow as the process moves."
        }
        icon={<BriefcaseBusiness aria-hidden="true" className="size-5" strokeWidth={2} />}
        action={
          hasFilters ? (
            <Button asChild variant="outline">
              <Link href="/applications">Clear filters</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/applications/new"><Plus aria-hidden="true" /> Add application</Link>
            </Button>
          )
        }
        className="min-h-[25rem]"
      />
    );
  }

  return (
    <section aria-label="Application files" className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="hidden grid-cols-[minmax(14rem,1.1fr)_minmax(21rem,1.4fr)_9rem_3rem] gap-5 border-b border-border bg-[#f4f6f4] px-5 py-3 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.11em] text-muted-foreground lg:grid">
        <span>Case</span>
        <span>Application route</span>
        <span>Dates</span>
        <span className="sr-only">Open</span>
      </div>
      <ol className="divide-y divide-border">
        {items.map((application) => (
          <li key={application.id}>
            <ApplicationRow application={application} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function ApplicationRow({ application }: { application: ApplicationListItemView }) {
  const stageVariant = variantForStage(application.currentStage.category);
  const recordNumber = application.id.slice(0, 6).toUpperCase();

  return (
    <article
      className={cn(
        "group relative grid gap-5 px-4 py-5 transition-colors hover:bg-[#f6f8f6] sm:px-5 lg:grid-cols-[minmax(14rem,1.1fr)_minmax(21rem,1.4fr)_9rem_3rem] lg:items-center",
        application.archivedAt && "bg-muted/35",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[0.6rem] font-semibold tracking-[0.12em] text-muted-foreground">AP-{recordNumber}</span>
          <Badge variant={stageVariant}>{application.currentStage.name}</Badge>
          {application.archivedAt ? <Badge variant="neutral">Archived</Badge> : null}
        </div>
        <h2 className="mt-2 truncate font-display text-xl font-semibold text-evergreen-deep">
          <Link
            href={`/applications/${application.id}`}
            className="outline-none after:absolute after:inset-0 focus-visible:underline focus-visible:decoration-cobalt focus-visible:decoration-2 focus-visible:underline-offset-4"
          >
            {application.jobTitle}
          </Link>
        </h2>
        <p className="mt-1 truncate text-sm font-medium text-muted-foreground">{application.company.name}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground lg:hidden">
          {application.location ? (
            <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" className="size-3.5" strokeWidth={2} />{application.location}</span>
          ) : null}
          {application.workMode ? <span className="capitalize">{application.workMode === "onsite" ? "On-site" : application.workMode}</span> : null}
        </div>
      </div>

      <RouteSpine
        label={`Route for ${application.jobTitle} at ${application.company.name}`}
        steps={[
          { label: "Found", value: application.source.name, state: "complete" },
          { label: "Applied", value: application.channel.name, state: application.appliedAt ? "complete" : "pending" },
          { label: "Current", value: application.currentStage.name, state: "current" },
        ]}
        className="relative z-[1] [&>li]:pb-4 [&>li:last-child]:pb-0 sm:[&>li]:pb-0"
      />

      <div className="flex items-center justify-between gap-5 border-t border-border pt-4 text-xs text-muted-foreground lg:block lg:border-t-0 lg:pt-0">
        <div>
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <CalendarDays aria-hidden="true" className="size-3.5" strokeWidth={2} />
            {application.appliedAt ? formatDate(application.appliedAt) : "Not applied"}
          </span>
          <span className="mt-1 block">Updated {formatDate(application.updatedAt)}</span>
        </div>
      </div>

      <span aria-hidden="true" className="relative z-[1] hidden size-9 place-items-center rounded-md border border-border bg-paper text-muted-foreground transition-colors group-hover:border-cobalt group-hover:text-cobalt lg:grid">
        <ArrowUpRight className="size-4" strokeWidth={2} />
      </span>
    </article>
  );
}

function variantForStage(
  category: string,
): VariantProps<typeof badgeVariants>["variant"] {
  if (["accepted", "offer"].includes(category)) return "success";
  if (["rejected", "withdrawn", "closed"].includes(category)) return "destructive";
  if (["screening", "assessment", "interview"].includes(category)) return "default";
  if (category === "ghosted") return "warning";
  return "neutral";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export { ApplicationList, formatDate, variantForStage };
export type { ApplicationListItemView, ApplicationListProps };
