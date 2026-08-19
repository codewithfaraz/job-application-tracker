"use client";

import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  Save,
} from "lucide-react";
import Link from "next/link";
import {
  useActionState,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/button";
import { FormJobAnalyzer } from "@/components/ai/form-job-analyzer";
import type { JobExtractionFormPatch } from "@/components/ai/job-extraction-artifact";
import type { AIAvailability } from "@/components/ai/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationActionState } from "@/lib/validation/application";
import { INITIAL_APPLICATION_ACTION_STATE } from "@/lib/validation/application";

type LookupOption = {
  id: string;
  name: string;
};

type StageOption = LookupOption & {
  category: string;
  sortOrder: number;
  isTerminal: boolean;
};

type ResumeOption = LookupOption & {
  originalFilename: string;
};

type ApplicationFormOptions = {
  sources: LookupOption[];
  channels: LookupOption[];
  stages: StageOption[];
  resumes: ResumeOption[];
};

type ApplicationFormValues = {
  id?: string;
  companyName: string;
  jobTitle: string;
  jobUrl: string;
  sourceId: string;
  channelId: string;
  stageId: string;
  location: string;
  workMode: string;
  employmentType: string;
  seniority: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  salaryPeriod: string;
  appliedAt: string;
  resumeId: string;
  rawJobDescription: string;
  notes: string;
};

type ApplicationFormAction = (
  state: ApplicationActionState,
  formData: FormData,
) => Promise<ApplicationActionState>;

type ApplicationFormProps = {
  action: ApplicationFormAction;
  aiAvailability: AIAvailability;
  options: ApplicationFormOptions;
  mode?: "create" | "edit";
  initialValues?: Partial<ApplicationFormValues>;
};

const workModes = [
  { value: "", label: "Not specified" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
  { value: "unknown", label: "Unknown" },
];

const employmentTypes = [
  { value: "", label: "Not specified" },
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" },
  { value: "unknown", label: "Unknown" },
];

const salaryPeriods = [
  { value: "", label: "Period" },
  { value: "hour", label: "Per hour" },
  { value: "day", label: "Per day" },
  { value: "month", label: "Per month" },
  { value: "year", label: "Per year" },
];

const stagesThatMayPrecedeAnApplication = new Set([
  "saved",
  "withdrawn",
  "closed",
]);

function localDateValue() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function ApplicationForm({
  action,
  aiAvailability,
  options,
  mode = "create",
  initialValues,
}: ApplicationFormProps) {
  const savedStage = options.stages.find((stage) => stage.category === "saved");
  const appliedStage = options.stages.find((stage) => stage.category === "applied");
  const fallbackStage = savedStage ?? appliedStage ?? options.stages[0];

  const initial = useMemo<ApplicationFormValues>(
    () => ({
      id: initialValues?.id,
      companyName: initialValues?.companyName ?? "",
      jobTitle: initialValues?.jobTitle ?? "",
      jobUrl: initialValues?.jobUrl ?? "",
      sourceId: initialValues?.sourceId ?? options.sources[0]?.id ?? "",
      channelId: initialValues?.channelId ?? options.channels[0]?.id ?? "",
      stageId: initialValues?.stageId ?? fallbackStage?.id ?? "",
      location: initialValues?.location ?? "",
      workMode: initialValues?.workMode ?? "",
      employmentType: initialValues?.employmentType ?? "",
      seniority: initialValues?.seniority ?? "",
      salaryMin: initialValues?.salaryMin ?? "",
      salaryMax: initialValues?.salaryMax ?? "",
      salaryCurrency: initialValues?.salaryCurrency ?? "USD",
      salaryPeriod: initialValues?.salaryPeriod ?? "",
      appliedAt: initialValues?.appliedAt ?? "",
      resumeId: initialValues?.resumeId ?? "",
      rawJobDescription: initialValues?.rawJobDescription ?? "",
      notes: initialValues?.notes ?? "",
    }),
    [fallbackStage?.id, initialValues, options.channels, options.sources],
  );

  const [values, setValues] = useState(initial);
  const [state, formAction, isPending] = useActionState(
    action,
    INITIAL_APPLICATION_ACTION_STATE,
  );

  const selectedStage = options.stages.find(
    (stage) => stage.id === values.stageId,
  );
  const needsApplicationDate = selectedStage
    ? !stagesThatMayPrecedeAnApplication.has(selectedStage.category)
    : false;
  const showApplicationDate = Boolean(values.appliedAt) || needsApplicationDate;
  const errors = state.fieldErrors ?? {};

  function change(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.currentTarget;
    setValues((current) => ({ ...current, [name]: value }));
  }

  function chooseStage(stageId: string) {
    const stage = options.stages.find((option) => option.id === stageId);

    setValues((current) => ({
      ...current,
      stageId,
      appliedAt:
        stage?.category === "saved"
          ? ""
          : stage && !stagesThatMayPrecedeAnApplication.has(stage.category)
            ? current.appliedAt || localDateValue()
            : current.appliedAt,
    }));
  }

  function applyExtractedFields(patch: JobExtractionFormPatch) {
    setValues((current) => ({ ...current, ...patch }));
  }

  const showSetupError =
    options.sources.length === 0 ||
    options.channels.length === 0 ||
    options.stages.length === 0;

  return (
    <form action={formAction} className="space-y-6">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      {state.status === "duplicate" ? (
        <DuplicateWarning
          duplicateId={state.duplicateId}
          message={state.message}
          pending={isPending}
        />
      ) : null}

      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="flex gap-3 rounded-lg border border-rose/30 bg-rose-soft p-4 text-sm text-evergreen-deep"
        >
          <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rose" strokeWidth={2} />
          <p>{state.message}</p>
        </div>
      ) : null}

      {showSetupError ? (
        <div role="alert" className="rounded-lg border border-amber/30 bg-amber-soft p-4 text-sm leading-6">
          Your workspace lookup values are not ready yet. Finish Supabase setup, then reload this page.
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border bg-[#f4f6f4] px-5 py-3 sm:px-6">
          <span className="grid size-8 place-items-center rounded-md border border-border bg-paper text-evergreen">
            <BriefcaseBusiness aria-hidden="true" className="size-4" strokeWidth={2} />
          </span>
          <div>
            <p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.13em] text-cobalt">
              Quick entry
            </p>
            <p className="text-xs text-muted-foreground">Only company and role need typing.</p>
          </div>
        </div>
        <CardContent className="space-y-6 pt-5 sm:pt-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="companyName"
              label="Company"
              required
              errors={errors.companyName}
            >
              <Input
                id="companyName"
                name="companyName"
                value={values.companyName}
                onChange={change}
                placeholder="Example Corp"
                autoComplete="organization"
                autoFocus={mode === "create"}
                required
                aria-invalid={Boolean(errors.companyName)}
                aria-describedby={describedBy("companyName", errors.companyName)}
              />
            </FormField>
            <FormField
              id="jobTitle"
              label="Role"
              required
              errors={errors.jobTitle}
            >
              <Input
                id="jobTitle"
                name="jobTitle"
                value={values.jobTitle}
                onChange={change}
                placeholder="Backend Engineer"
                autoComplete="organization-title"
                required
                aria-invalid={Boolean(errors.jobTitle)}
                aria-describedby={describedBy("jobTitle", errors.jobTitle)}
              />
            </FormField>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <FormField
              id="sourceId"
              label="Found via"
              hint="Where you discovered the role."
              errors={errors.sourceId}
            >
              <NativeSelect
                id="sourceId"
                name="sourceId"
                value={values.sourceId}
                onChange={change}
                required
                aria-invalid={Boolean(errors.sourceId)}
                aria-describedby={describedBy("sourceId", errors.sourceId, true)}
              >
                {options.sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField
              id="channelId"
              label="Applied through"
              hint="Where you actually sent the application."
              errors={errors.channelId}
            >
              <NativeSelect
                id="channelId"
                name="channelId"
                value={values.channelId}
                onChange={change}
                required
                aria-invalid={Boolean(errors.channelId)}
                aria-describedby={describedBy("channelId", errors.channelId, true)}
              >
                {options.channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>

          {mode === "create" ? (
            <fieldset>
              <legend className="text-sm font-semibold text-evergreen-deep">Status</legend>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Save a lead for later, or record an application you already sent.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {savedStage ? (
                  <StageChoice
                    id="stage-saved"
                    name="stageId"
                    value={savedStage.id}
                    checked={values.stageId === savedStage.id}
                    onChange={() => chooseStage(savedStage.id)}
                    title="Saved"
                    description="Interesting role; not applied yet."
                  />
                ) : null}
                {appliedStage ? (
                  <StageChoice
                    id="stage-applied"
                    name="stageId"
                    value={appliedStage.id}
                    checked={values.stageId === appliedStage.id}
                    onChange={() => chooseStage(appliedStage.id)}
                    title="Applied"
                    description="Application has been submitted."
                  />
                ) : null}
              </div>
              <FieldErrors id="stageId" errors={errors.stageId} />
            </fieldset>
          ) : (
            <FormField
              id="stageId"
              label="Current stage"
              hint="Changing this creates a new entry in the application history."
              errors={errors.stageId}
            >
              <NativeSelect
                id="stageId"
                name="stageId"
                value={values.stageId}
                onChange={(event) => chooseStage(event.currentTarget.value)}
                required
                aria-invalid={Boolean(errors.stageId)}
                aria-describedby={describedBy("stageId", errors.stageId, true)}
              >
                {options.stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          )}

          {showApplicationDate ? (
            <FormField
              id="appliedAt"
              label="Date applied"
              hint="You can correct this later if you are logging an older application."
              errors={errors.appliedAt}
            >
              <div className="relative max-w-xs">
                <CalendarDays aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={2} />
                <Input
                  id="appliedAt"
                  name="appliedAt"
                  type="date"
                  value={values.appliedAt}
                  onChange={change}
                  className="pl-9"
                  required={needsApplicationDate}
                  aria-invalid={Boolean(errors.appliedAt)}
                  aria-describedby={describedBy("appliedAt", errors.appliedAt, true)}
                />
              </div>
            </FormField>
          ) : (
            <input type="hidden" name="appliedAt" value="" />
          )}
        </CardContent>
      </Card>

      <details className="group overflow-hidden rounded-lg border border-border bg-card">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 outline-none transition-colors hover:bg-[#f4f6f4] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cobalt sm:px-6 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block font-display text-lg font-semibold text-evergreen-deep">More details</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Job description, compensation, location, notes, and resume.
            </span>
          </span>
          <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" strokeWidth={2} />
        </summary>

        <div className="space-y-7 border-t border-border px-5 py-5 sm:px-6 sm:py-6">
          <section aria-labelledby="role-details-heading">
            <SectionHeading id="role-details-heading" number="01" title="Role details" />
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <FormField id="jobUrl" label="Job URL" errors={errors.jobUrl}>
                <Input
                  id="jobUrl"
                  name="jobUrl"
                  type="url"
                  value={values.jobUrl}
                  onChange={change}
                  placeholder="https://…"
                  inputMode="url"
                  aria-invalid={Boolean(errors.jobUrl)}
                  aria-describedby={describedBy("jobUrl", errors.jobUrl)}
                />
              </FormField>
              <FormField id="location" label="Location" errors={errors.location}>
                <Input
                  id="location"
                  name="location"
                  value={values.location}
                  onChange={change}
                  placeholder="Lahore, PK or Remote"
                  autoComplete="address-level2"
                  aria-invalid={Boolean(errors.location)}
                  aria-describedby={describedBy("location", errors.location)}
                />
              </FormField>
              <FormField id="workMode" label="Work mode" errors={errors.workMode}>
                <NativeSelect id="workMode" name="workMode" value={values.workMode} onChange={change} aria-invalid={Boolean(errors.workMode)}>
                  {workModes.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField id="employmentType" label="Employment type" errors={errors.employmentType}>
                <NativeSelect id="employmentType" name="employmentType" value={values.employmentType} onChange={change} aria-invalid={Boolean(errors.employmentType)}>
                  {employmentTypes.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField id="seniority" label="Seniority" errors={errors.seniority}>
                <Input id="seniority" name="seniority" value={values.seniority} onChange={change} placeholder="Mid-level, Senior, Lead…" aria-invalid={Boolean(errors.seniority)} />
              </FormField>
            </div>
          </section>

          <section aria-labelledby="compensation-heading" className="border-t border-border pt-7">
            <SectionHeading id="compensation-heading" number="02" title="Compensation" />
            <p className="mt-1 text-xs leading-5 text-muted-foreground">Record only what the listing states; every field is optional.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <FormField id="salaryMin" label="Minimum" errors={errors.salaryMin}>
                <Input id="salaryMin" name="salaryMin" type="number" min="0" step="any" inputMode="decimal" value={values.salaryMin} onChange={change} placeholder="80000" aria-invalid={Boolean(errors.salaryMin)} />
              </FormField>
              <FormField id="salaryMax" label="Maximum" errors={errors.salaryMax}>
                <Input id="salaryMax" name="salaryMax" type="number" min="0" step="any" inputMode="decimal" value={values.salaryMax} onChange={change} placeholder="110000" aria-invalid={Boolean(errors.salaryMax)} />
              </FormField>
              <FormField id="salaryCurrency" label="Currency" errors={errors.salaryCurrency}>
                <Input id="salaryCurrency" name="salaryCurrency" value={values.salaryCurrency} onChange={change} placeholder="USD" maxLength={3} className="uppercase" aria-invalid={Boolean(errors.salaryCurrency)} />
              </FormField>
              <FormField id="salaryPeriod" label="Period" errors={errors.salaryPeriod}>
                <NativeSelect id="salaryPeriod" name="salaryPeriod" value={values.salaryPeriod} onChange={change} aria-invalid={Boolean(errors.salaryPeriod)}>
                  {salaryPeriods.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NativeSelect>
              </FormField>
            </div>
          </section>

          <section aria-labelledby="archive-heading" className="border-t border-border pt-7">
            <SectionHeading id="archive-heading" number="03" title="Case-file archive" />
            <div className="mt-4 space-y-5">
              <FormField
                id="rawJobDescription"
                label="Original job description"
                hint="Stored exactly as pasted. The saved URL is never fetched."
                errors={errors.rawJobDescription}
              >
                <Textarea
                  id="rawJobDescription"
                  name="rawJobDescription"
                  value={values.rawJobDescription}
                  onChange={change}
                  placeholder="Paste the complete job description here…"
                  className="min-h-64 font-mono text-[0.78rem] leading-6"
                  spellCheck
                  aria-invalid={Boolean(errors.rawJobDescription)}
                  aria-describedby={describedBy("rawJobDescription", errors.rawJobDescription, true)}
                />
              </FormField>

              <FormJobAnalyzer
                jobDescription={values.rawJobDescription}
                availability={aiAvailability}
                onApply={applyExtractedFields}
              />

              <FormField id="notes" label="Notes" hint="Recruiter context, questions, follow-up details, or anything worth remembering." errors={errors.notes}>
                <Textarea id="notes" name="notes" value={values.notes} onChange={change} placeholder="Add private notes…" className="min-h-36" aria-invalid={Boolean(errors.notes)} />
              </FormField>

              <FormField id="resumeId" label="Resume submitted" hint="Choose the exact version you used, if it is already in your resume library." errors={errors.resumeId}>
                <NativeSelect id="resumeId" name="resumeId" value={values.resumeId} onChange={change} aria-invalid={Boolean(errors.resumeId)}>
                  <option value="">No resume selected</option>
                  {options.resumes.map((resume) => (
                    <option key={resume.id} value={resume.id}>
                      {resume.name} · {resume.originalFilename}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
            </div>
          </section>
        </div>
      </details>

      <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-lg border border-border bg-paper/95 p-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <Check aria-hidden="true" className="size-4 text-evergreen" strokeWidth={2.2} />
          The original job description stays unchanged.
        </p>
        <div className="flex gap-2 sm:ml-auto">
          <Button asChild variant="ghost" className="flex-1 sm:flex-none">
            <Link href={values.id ? `/applications/${values.id}` : "/applications"}>Cancel</Link>
          </Button>
          <Button
            type="submit"
            className="flex-1 sm:flex-none"
            disabled={isPending || showSetupError}
          >
            <Save aria-hidden="true" />
            {isPending ? "Saving…" : mode === "edit" ? "Save changes" : "Save application"}
          </Button>
        </div>
      </div>

    </form>
  );
}

function DuplicateWarning({
  duplicateId,
  message,
  pending,
}: {
  duplicateId?: string;
  message?: string;
  pending: boolean;
}) {
  return (
    <div role="alert" className="rounded-lg border border-amber/35 bg-amber-soft p-4 sm:p-5">
      <div className="flex gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber" strokeWidth={2} />
        <div>
          <p className="font-display text-lg font-semibold text-evergreen-deep">A similar case already exists</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {message ?? "We found the same company and role. Your form is still intact—review the existing case or save this as a reapplication."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {duplicateId ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/applications/${duplicateId}`}>Open existing case</Link>
              </Button>
            ) : null}
            <Button
              type="submit"
              name="confirmDuplicate"
              value="true"
              variant="evergreen"
              size="sm"
              disabled={pending}
            >
              {pending ? "Creating…" : "Create anyway"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StageChoice({
  id,
  title,
  description,
  ...props
}: React.ComponentProps<"input"> & { title: string; description: string }) {
  return (
    <label htmlFor={id} className="relative cursor-pointer rounded-lg border border-input bg-paper p-4 transition-colors has-[:checked]:border-cobalt has-[:checked]:bg-cobalt-soft/65 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cobalt has-[:focus-visible]:ring-offset-2">
      <input id={id} type="radio" className="peer sr-only" {...props} />
      <span className="flex items-start gap-3">
        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-input bg-white peer-checked:border-cobalt peer-checked:bg-cobalt">
          <span className="size-1.5 rounded-full bg-white" />
        </span>
        <span>
          <span className="block text-sm font-semibold text-evergreen-deep">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
        </span>
      </span>
    </label>
  );
}

function SectionHeading({ id, number, title }: { id: string; number: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[0.62rem] font-semibold tracking-[0.12em] text-cobalt">{number}</span>
      <h2 id={id} className="font-display text-lg font-semibold text-evergreen-deep">{title}</h2>
    </div>
  );
}

function FormField({
  id,
  label,
  hint,
  required,
  errors,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  errors?: string[];
  children: ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-1 text-rose" aria-hidden="true">*</span> : null}
      </Label>
      {hint ? <p id={`${id}-hint`} className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p> : null}
      <div className="mt-2">{children}</div>
      <FieldErrors id={id} errors={errors} />
    </div>
  );
}

function FieldErrors({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;

  return (
    <div id={`${id}-error`} className="mt-1.5 text-xs leading-5 text-destructive">
      {errors.map((error) => <p key={error}>{error}</p>)}
    </div>
  );
}

function describedBy(id: string, errors?: string[], hasHint = false) {
  return [hasHint ? `${id}-hint` : null, errors?.length ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ") || undefined;
}

export { ApplicationForm };
export type {
  ApplicationFormAction,
  ApplicationFormOptions,
  ApplicationFormProps,
  ApplicationFormValues,
};
