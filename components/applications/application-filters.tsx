import { Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

type FilterOption = {
  id: string;
  name: string;
};

type ApplicationFilterValues = {
  q?: string;
  stage?: string;
  source?: string;
  channel?: string;
  workMode?: string;
  archive?: string;
  sort?: string;
};

type ApplicationFiltersProps = {
  values: ApplicationFilterValues;
  stages: FilterOption[];
  sources: FilterOption[];
  channels: FilterOption[];
  total: number;
};

const workModeOptions = [
  { value: "", label: "Any work mode" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
  { value: "unknown", label: "Unknown" },
];

const sortOptions = [
  { value: "updated_desc", label: "Recently updated" },
  { value: "created_desc", label: "Recently added" },
  { value: "applied_desc", label: "Application date" },
  { value: "title_asc", label: "Role A–Z" },
];

function ApplicationFilters({
  values,
  stages,
  sources,
  channels,
  total,
}: ApplicationFiltersProps) {
  const hasFilters = Boolean(
    values.q ||
      values.stage ||
      values.source ||
      values.channel ||
      values.workMode ||
      (values.archive && values.archive !== "active") ||
      (values.sort && values.sort !== "updated_desc"),
  );

  return (
    <form
      action="/applications"
      method="get"
      className="rounded-lg border border-border bg-card"
    >
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-end sm:p-5">
        <div className="min-w-0 flex-1">
          <Label htmlFor="application-search" className="sr-only">
            Search applications
          </Label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              strokeWidth={2}
            />
            <Input
              id="application-search"
              name="q"
              type="search"
              defaultValue={values.q}
              placeholder="Search company or role"
              className="pl-9 sm:h-11"
            />
          </div>
        </div>
        <Button type="submit" className="sm:h-11 sm:px-5">
          Search files
        </Button>
      </div>

      <details className="group" open={hasFilters}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-evergreen-deep outline-none hover:bg-[#f4f6f4] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cobalt sm:px-5 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <SlidersHorizontal aria-hidden="true" className="size-4 text-cobalt" strokeWidth={2} />
            Filter and sort
            <span className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {total} {total === 1 ? "file" : "files"}
            </span>
          </span>
          <span className="text-xs font-medium text-muted-foreground group-open:hidden">Show</span>
          <span className="hidden text-xs font-medium text-muted-foreground group-open:inline">Hide</span>
        </summary>

        <div className="border-t border-border px-4 py-4 sm:px-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <FilterSelect label="Stage" name="stage" defaultValue={values.stage}>
              <option value="">Any stage</option>
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Found via" name="source" defaultValue={values.source}>
              <option value="">Any source</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>{source.name}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Applied through" name="channel" defaultValue={values.channel}>
              <option value="">Any channel</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>{channel.name}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Work mode" name="workMode" defaultValue={values.workMode}>
              {workModeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </FilterSelect>
            <FilterSelect label="Archive" name="archive" defaultValue={values.archive ?? "active"}>
              <option value="active">Active files</option>
              <option value="archived">Archived files</option>
              <option value="all">All files</option>
            </FilterSelect>
            <FilterSelect label="Sort" name="sort" defaultValue={values.sort ?? "updated_desc"}>
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </FilterSelect>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            {hasFilters ? (
              <Button asChild type="button" variant="ghost" size="sm">
                <Link href="/applications">
                  <X aria-hidden="true" /> Clear filters
                </Link>
              </Button>
            ) : null}
            <Button type="submit" variant="outline" size="sm">
              Apply filters
            </Button>
          </div>
        </div>
      </details>
    </form>
  );
}

function FilterSelect({
  label,
  name,
  children,
  defaultValue,
}: {
  label: string;
  name: string;
  children: React.ReactNode;
  defaultValue?: string;
}) {
  return (
    <div>
      <Label htmlFor={`filter-${name}`} className="text-xs">
        {label}
      </Label>
      <NativeSelect
        id={`filter-${name}`}
        name={name}
        defaultValue={defaultValue}
        className="mt-2"
      >
        {children}
      </NativeSelect>
    </div>
  );
}

export { ApplicationFilters };
export type { ApplicationFilterValues, ApplicationFiltersProps };
