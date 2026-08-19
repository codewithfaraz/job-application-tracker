"use client";

import { Check, ClipboardCheck, Info } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { JobExtraction } from "@/lib/ai/schemas";

type JobExtractionFormPatch = Partial<{
  companyName: string;
  jobTitle: string;
  location: string;
  workMode: string;
  employmentType: string;
  seniority: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  salaryPeriod: string;
}>;

type CoreField =
  | "companyName"
  | "jobTitle"
  | "location"
  | "workMode"
  | "employmentType"
  | "seniority"
  | "salary";

type ExtractionDraft = {
  companyName: string;
  jobTitle: string;
  location: string;
  workMode: string;
  employmentType: string;
  seniority: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  salaryPeriod: string;
};

const workModes = ["remote", "hybrid", "onsite", "unknown"];
const employmentTypes = [
  "full-time",
  "part-time",
  "contract",
  "internship",
  "temporary",
  "unknown",
];
const salaryPeriods = ["hour", "day", "month", "year"];

function draftFromExtraction(data: JobExtraction): ExtractionDraft {
  return {
    companyName: data.companyName ?? "",
    jobTitle: data.jobTitle ?? "",
    location: data.location ?? "",
    workMode: data.workMode,
    employmentType: data.employmentType,
    seniority: data.seniority ?? "",
    salaryMin: data.salary.min?.toString() ?? "",
    salaryMax: data.salary.max?.toString() ?? "",
    salaryCurrency: data.salary.currency ?? "",
    salaryPeriod: data.salary.period ?? "",
  };
}

function selectedFromExtraction(data: JobExtraction): Record<CoreField, boolean> {
  return {
    companyName: Boolean(data.companyName),
    jobTitle: Boolean(data.jobTitle),
    location: Boolean(data.location),
    workMode: data.workMode !== "unknown",
    employmentType: data.employmentType !== "unknown",
    seniority: Boolean(data.seniority),
    salary: Object.values(data.salary).some((value) => value !== null),
  };
}

function JobExtractionReview({
  data,
  onApply,
}: {
  data: JobExtraction;
  onApply: (patch: JobExtractionFormPatch) => void;
}) {
  const initialDraft = useMemo(() => draftFromExtraction(data), [data]);
  const [draft, setDraft] = useState(initialDraft);
  const [selected, setSelected] = useState(() => selectedFromExtraction(data));
  const [applied, setApplied] = useState(false);

  function update(field: keyof ExtractionDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setApplied(false);
  }

  function toggle(field: CoreField) {
    setSelected((current) => ({ ...current, [field]: !current[field] }));
    setApplied(false);
  }

  function applySelected() {
    const patch: JobExtractionFormPatch = {};

    if (selected.companyName) patch.companyName = draft.companyName;
    if (selected.jobTitle) patch.jobTitle = draft.jobTitle;
    if (selected.location) patch.location = draft.location;
    if (selected.workMode) patch.workMode = draft.workMode;
    if (selected.employmentType) {
      patch.employmentType = draft.employmentType;
    }
    if (selected.seniority) patch.seniority = draft.seniority;
    if (selected.salary) {
      patch.salaryMin = draft.salaryMin;
      patch.salaryMax = draft.salaryMax;
      patch.salaryCurrency = draft.salaryCurrency;
      patch.salaryPeriod = draft.salaryPeriod;
    }

    onApply(patch);
    setApplied(true);
  }

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <section
      aria-labelledby="extraction-review-heading"
      className="border-l-2 border-cobalt bg-paper p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-cobalt">
            Review before applying
          </p>
          <h3
            id="extraction-review-heading"
            className="mt-1 font-display text-xl font-semibold text-evergreen-deep"
          >
            Extracted facts
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            Check only the fields you want to copy. You can correct every value
            first; the original job description will not change.
          </p>
        </div>
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.09em] text-muted-foreground">
          {selectedCount} selected
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <ReviewTextField
          field="companyName"
          label="Company"
          value={draft.companyName}
          selected={selected.companyName}
          onToggle={toggle}
          onChange={update}
          placeholder="Not found"
        />
        <ReviewTextField
          field="jobTitle"
          label="Role"
          value={draft.jobTitle}
          selected={selected.jobTitle}
          onToggle={toggle}
          onChange={update}
          placeholder="Not found"
        />
        <ReviewTextField
          field="location"
          label="Location"
          value={draft.location}
          selected={selected.location}
          onToggle={toggle}
          onChange={update}
          placeholder="Not found"
        />
        <ReviewSelectField
          field="workMode"
          selectionField="workMode"
          label="Work mode"
          value={draft.workMode}
          selected={selected.workMode}
          options={workModes}
          onToggle={toggle}
          onChange={update}
        />
        <ReviewSelectField
          field="employmentType"
          selectionField="employmentType"
          label="Employment type"
          value={draft.employmentType}
          selected={selected.employmentType}
          options={employmentTypes}
          onToggle={toggle}
          onChange={update}
        />
        <ReviewTextField
          field="seniority"
          label="Seniority"
          value={draft.seniority}
          selected={selected.seniority}
          onToggle={toggle}
          onChange={update}
          placeholder="Not found"
        />
      </div>

      <div className="mt-4 rounded-md border border-border bg-[#f4f6f4] p-4">
        <ReviewCheckbox
          id="review-salary"
          label="Compensation"
          checked={selected.salary}
          onChange={() => toggle("salary")}
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ReviewInput
            id="review-salary-min"
            label="Minimum"
            type="number"
            value={draft.salaryMin}
            onChange={(value) => update("salaryMin", value)}
          />
          <ReviewInput
            id="review-salary-max"
            label="Maximum"
            type="number"
            value={draft.salaryMax}
            onChange={(value) => update("salaryMax", value)}
          />
          <ReviewInput
            id="review-salary-currency"
            label="Currency"
            value={draft.salaryCurrency}
            onChange={(value) => update("salaryCurrency", value.toUpperCase())}
            maxLength={3}
          />
          <div>
            <Label htmlFor="review-salary-period" className="text-xs">
              Period
            </Label>
            <NativeSelect
              id="review-salary-period"
              value={draft.salaryPeriod}
              onChange={(event) => update("salaryPeriod", event.currentTarget.value)}
              className="mt-1.5"
            >
              <option value="">Not found</option>
              {salaryPeriods.map((period) => (
                <option key={period} value={period}>
                  Per {period}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          {applied ? (
            <Check aria-hidden="true" className="size-4 text-evergreen" strokeWidth={2} />
          ) : (
            <Info aria-hidden="true" className="size-4" strokeWidth={2} />
          )}
          {applied
            ? "Selected values are now in the application form."
            : "Nothing is copied until you apply the selection."}
        </p>
        <Button
          type="button"
          variant="evergreen"
          size="sm"
          onClick={applySelected}
          disabled={selectedCount === 0}
        >
          <ClipboardCheck aria-hidden="true" /> Apply selected
        </Button>
      </div>

      <SupportingExtraction data={data} />
    </section>
  );
}

function JobExtractionArtifact({ data }: { data: JobExtraction }) {
  const facts = [
    ["Company", data.companyName ?? "Not stated"],
    ["Role", data.jobTitle ?? "Not stated"],
    ["Location", data.location ?? "Not stated"],
    ["Work mode", humanize(data.workMode)],
    ["Employment", humanize(data.employmentType)],
    ["Seniority", data.seniority ?? "Not stated"],
    ["Experience", data.requiredExperienceYears === null ? "Not stated" : `${data.requiredExperienceYears} years`],
    ["Compensation", formatSalary(data.salary)],
  ];

  return (
    <div className="space-y-5">
      {data.summary ? (
        <div className="border-l-2 border-cobalt pl-4">
          <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Role summary
          </p>
          <p className="mt-2 text-sm leading-7 text-foreground">{data.summary}</p>
        </div>
      ) : null}

      <dl className="grid overflow-hidden rounded-md border border-border sm:grid-cols-2 lg:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label} className="border-b border-border p-3 last:border-b-0 sm:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 lg:[&:nth-last-child(-n+4)]:border-b-0 lg:[&:nth-child(4n)]:border-r-0">
            <dt className="font-mono text-[0.57rem] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1.5 text-sm font-medium text-evergreen-deep">{value}</dd>
          </div>
        ))}
      </dl>

      <SupportingExtraction data={data} defaultOpen />
    </div>
  );
}

function SupportingExtraction({
  data,
  defaultOpen = false,
}: {
  data: JobExtraction;
  defaultOpen?: boolean;
}) {
  const groups = [
    { label: "Required skills", values: data.requiredSkills },
    { label: "Preferred skills", values: data.preferredSkills },
    { label: "Key requirements", values: data.keyRequirements },
    { label: "Responsibilities", values: data.responsibilities },
    { label: "Education", values: data.educationRequirements },
    { label: "Benefits", values: data.benefits },
  ].filter((group) => group.values.length > 0);

  if (groups.length === 0 && !data.visaSponsorship) return null;

  return (
    <details className="mt-5 border-t border-border pt-4" open={defaultOpen}>
      <summary className="cursor-pointer text-sm font-semibold text-evergreen-deep outline-none focus-visible:underline focus-visible:decoration-cobalt focus-visible:underline-offset-4">
        Supporting extraction
      </summary>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              {group.label}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm leading-6">
              {group.values.map((value) => (
                <li key={value} className="flex gap-2">
                  <span aria-hidden="true" className="mt-[0.65rem] size-1 shrink-0 rounded-full bg-cobalt" />
                  <span>{value}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {data.visaSponsorship ? (
          <div>
            <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
              Visa sponsorship
            </p>
            <p className="mt-2 text-sm leading-6">{data.visaSponsorship}</p>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function ReviewTextField({
  field,
  label,
  value,
  selected,
  onToggle,
  onChange,
  placeholder,
}: {
  field: Exclude<keyof ExtractionDraft, "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod" | "workMode" | "employmentType">;
  label: string;
  value: string;
  selected: boolean;
  onToggle: (field: CoreField) => void;
  onChange: (field: keyof ExtractionDraft, value: string) => void;
  placeholder: string;
}) {
  const id = `review-${field}`;
  return (
    <div>
      <ReviewCheckbox id={`${id}-apply`} label={label} checked={selected} onChange={() => onToggle(field)} />
      <Input id={id} aria-label={`${label} extracted value`} value={value} onChange={(event) => onChange(field, event.currentTarget.value)} placeholder={placeholder} className="mt-2" />
    </div>
  );
}

function ReviewSelectField({
  field,
  selectionField,
  label,
  value,
  selected,
  options,
  onToggle,
  onChange,
}: {
  field: "workMode" | "employmentType";
  selectionField: CoreField;
  label: string;
  value: string;
  selected: boolean;
  options: string[];
  onToggle: (field: CoreField) => void;
  onChange: (field: keyof ExtractionDraft, value: string) => void;
}) {
  const id = `review-${field}`;
  return (
    <div>
      <ReviewCheckbox id={`${id}-apply`} label={label} checked={selected} onChange={() => onToggle(selectionField)} />
      <NativeSelect id={id} aria-label={`${label} extracted value`} value={value} onChange={(event) => onChange(field, event.currentTarget.value)} className="mt-2">
        {options.map((option) => (
          <option key={option} value={option}>{humanize(option)}</option>
        ))}
      </NativeSelect>
    </div>
  );
}

function ReviewCheckbox({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-evergreen-deep">
      <input id={id} type="checkbox" checked={checked} onChange={onChange} className="size-4 accent-cobalt" />
      {label}
    </label>
  );
}

function ReviewInput({ id, label, value, onChange, type = "text", maxLength }: { id: string; label: string; value: string; onChange: (value: string) => void; type?: string; maxLength?: number }) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} type={type} min={type === "number" ? 0 : undefined} step={type === "number" ? "any" : undefined} value={value} onChange={(event) => onChange(event.currentTarget.value)} maxLength={maxLength} className="mt-1.5" />
    </div>
  );
}

function humanize(value: string) {
  if (value === "onsite") return "On-site";
  if (value === "full-time") return "Full-time";
  if (value === "part-time") return "Part-time";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatSalary(salary: JobExtraction["salary"]) {
  if (Object.values(salary).every((value) => value === null)) return "Not stated";
  const number = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
  const minimum = salary.min === null ? null : number.format(salary.min);
  const maximum = salary.max === null ? null : number.format(salary.max);
  const range = minimum && maximum ? `${minimum}–${maximum}` : minimum ?? maximum ?? "";
  return `${salary.currency ?? ""} ${range}${salary.period ? ` / ${salary.period}` : ""}`.trim();
}

export { JobExtractionArtifact, JobExtractionReview };
export type { JobExtractionFormPatch };
