import { BriefcaseBusiness, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ApplicationFilters } from "@/components/applications/application-filters";
import { ApplicationList } from "@/components/applications/application-list";
import { Button } from "@/components/ui/button";
import {
  getApplicationFormOptions,
  listApplications,
  type ApplicationListFilters,
} from "@/lib/data/applications";

export const metadata: Metadata = {
  title: "Applications",
  description: "Search and review every job application case file.",
};

type ApplicationsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ApplicationsPage({
  searchParams,
}: ApplicationsPageProps) {
  const raw = await searchParams;
  const filters: ApplicationListFilters = {
    q: first(raw.q),
    stage: first(raw.stage),
    source: first(raw.source),
    channel: first(raw.channel),
    workMode: first(raw.workMode),
    archive: first(raw.archive),
    sort: first(raw.sort),
    page: first(raw.page),
    pageSize: first(raw.pageSize),
  };

  const [result, options] = await Promise.all([
    listApplications(filters),
    getApplicationFormOptions(),
  ]);

  const filterValues = {
    q: first(raw.q),
    stage: first(raw.stage),
    source: first(raw.source),
    channel: first(raw.channel),
    workMode: first(raw.workMode),
    archive: first(raw.archive),
    sort: first(raw.sort),
  };
  const hasFilters = Object.values(filterValues).some(Boolean);

  return (
    <div className="mx-auto w-full max-w-[86rem]">
      <header className="flex flex-col gap-5 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cobalt">
            Case desk / Applications
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-none text-evergreen-deep sm:text-5xl">
            Application files
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Find any company or role, then recover the exact route, dates, and context in one place.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/applications/new">
            <Plus aria-hidden="true" /> Add application
          </Link>
        </Button>
      </header>

      <div className="mt-7 space-y-5">
        <ApplicationFilters
          values={filterValues}
          stages={options.stages}
          sources={options.sources}
          channels={options.channels}
          total={result.total}
        />

        {result.total > 0 ? (
          <div className="flex items-center justify-between gap-4 px-1">
            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <BriefcaseBusiness aria-hidden="true" className="size-4" strokeWidth={2} />
              Showing {Math.min((result.page - 1) * result.pageSize + 1, result.total)}–{Math.min(result.page * result.pageSize, result.total)} of {result.total}
            </p>
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.09em] text-muted-foreground">
              Page {result.page} of {Math.max(result.totalPages, 1)}
            </p>
          </div>
        ) : null}

        <ApplicationList items={result.items} hasFilters={hasFilters} />

        {result.totalPages > 1 ? (
          <nav aria-label="Applications pagination" className="flex items-center justify-between gap-3 pt-1">
            <Button asChild={result.page > 1} variant="outline" disabled={result.page <= 1}>
              {result.page > 1 ? <Link href={pageHref(raw, result.page - 1)}>Previous</Link> : <span>Previous</span>}
            </Button>
            <span className="text-xs text-muted-foreground">Page {result.page} of {result.totalPages}</span>
            <Button asChild={result.page < result.totalPages} variant="outline" disabled={result.page >= result.totalPages}>
              {result.page < result.totalPages ? <Link href={pageHref(raw, result.page + 1)}>Next</Link> : <span>Next</span>}
            </Button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function pageHref(
  values: Record<string, string | string[] | undefined>,
  page: number,
) {
  const query = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(values)) {
    const value = first(rawValue);
    if (value && key !== "page") query.set(key, value);
  }

  query.set("page", String(page));
  return `/applications?${query.toString()}`;
}
