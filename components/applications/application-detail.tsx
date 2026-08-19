import {
  BriefcaseBusiness,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  ExternalLink,
  FileText,
  Laptop,
  MapPin,
  NotebookText,
  Paperclip,
  Route,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ApplicationAIWorkbench } from "@/components/ai/application-ai-workbench";
import { ApplicationRecordActions } from "@/components/applications/application-record-actions";
import { CopyTextButton } from "@/components/applications/copy-text-button";
import { ApplicationCrm } from "@/components/crm/application-crm";
import { CompanyEditor } from "@/components/crm/company-editor";
import { RouteSpine } from "@/components/layout/route-spine";
import { StageChangeForm } from "@/components/pipeline/stage-change-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type {
  ApplicationDetail as ApplicationDetailData,
  ApplicationFormOptions,
} from "@/lib/data/applications";
import type { StoredAIArtifact } from "@/lib/data/ai";
import { getAIConfigurationStatus } from "@/lib/ai/config";
import { jobExtractionSchema } from "@/lib/ai/schemas";
import { buildApplicationTimeline } from "@/lib/pipeline/timeline";

type ApplicationDetailProps = {
  application: ApplicationDetailData;
  options: ApplicationFormOptions;
  aiHistory: StoredAIArtifact[];
};

function ApplicationDetail({ application, options, aiHistory }: ApplicationDetailProps) {
  const timeline = buildApplicationTimeline({
    stageHistory: application.stageHistory,
    events: application.events,
    notes: application.noteEntries,
  });
  const parsedExtraction = jobExtractionSchema.safeParse(
    application.aiExtractedData,
  );
  const savedExtraction = parsedExtraction.success
    ? parsedExtraction.data
    : null;
  const aiAvailability = getAIConfigurationStatus();

  return (
    <div className="space-y-7">
      {application.archivedAt ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-evergreen-deep">This case file is archived.</p>
          <p className="text-xs text-muted-foreground">Archived {formatDate(application.archivedAt)}</p>
        </div>
      ) : null}

      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={stageBadgeVariant(application.currentStage.category)}>
                  {application.currentStage.name}
                </Badge>
                {application.archivedAt ? <Badge variant="neutral">Archived</Badge> : null}
              </div>
              <h1 className="mt-4 font-display text-4xl font-semibold leading-[0.98] text-evergreen-deep sm:text-5xl">
                {application.jobTitle}
              </h1>
              <p className="mt-3 text-lg font-semibold text-muted-foreground">{application.company.name}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {application.jobUrl ? (
                <Button asChild variant="outline">
                  <a href={application.jobUrl} target="_blank" rel="noreferrer">
                    Posting <ExternalLink aria-hidden="true" />
                  </a>
                </Button>
              ) : null}
              <Button asChild>
                <Link href={`/applications/${application.id}/edit`}>Edit case</Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 sm:pt-6">
          <RouteSpine
            steps={[
              {
                label: "Found",
                value: application.source.name,
                detail: "Discovery source",
                state: "complete",
              },
              {
                label: "Applied",
                value: application.channel.name,
                detail: application.appliedAt ? formatDate(application.appliedAt) : "Not applied yet",
                state: application.appliedAt ? "complete" : "pending",
              },
              {
                label: "Current",
                value: application.currentStage.name,
                detail: `Updated ${formatDate(application.updatedAt)}`,
                state: "current",
              },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,0.5fr)]">
        <div className="min-w-0 space-y-7">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4 border-b border-border">
              <div>
                <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-cobalt">Primary evidence</p>
                <CardTitle className="mt-1">Original job description</CardTitle>
              </div>
              {application.rawJobDescription ? <CopyTextButton targetId="raw-job-description" label="Copy JD" /> : null}
            </CardHeader>
            <CardContent className="pt-5 sm:pt-6">
              {application.rawJobDescription ? (
                <pre id="raw-job-description" className="max-h-[42rem] overflow-y-auto whitespace-pre-wrap break-words rounded-md border border-border bg-[#f4f6f4] p-4 font-sans text-sm leading-7 text-foreground sm:p-5">
                  {application.rawJobDescription}
                </pre>
              ) : (
                <MissingSection
                  icon={<FileText aria-hidden="true" className="size-5" strokeWidth={2} />}
                  title="No job description saved"
                  description="The application still works normally. Add the original listing whenever you find it."
                  href={`/applications/${application.id}/edit`}
                  action="Add description"
                />
              )}
              <a href="#ai-workbench" className="mt-4 flex items-start gap-3 rounded-md border border-dashed border-input bg-paper p-4 outline-none transition-colors hover:border-cobalt focus-visible:ring-2 focus-visible:ring-cobalt">
                <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                <div>
                  <p className="text-sm font-semibold text-evergreen-deep">Open the AI workbench</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted-foreground">Analyze only this saved text, compare a resume, or prepare for an interview. Nothing runs automatically.</p>
                </div>
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border">
              <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-cobalt">Working memory</p>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 sm:pt-6">
              {application.notes ? (
                <p className="whitespace-pre-wrap text-sm leading-7 text-foreground">{application.notes}</p>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">No notes have been added to this case yet.</p>
              )}

              {application.noteEntries.length > 0 ? (
                <div className="mt-6 space-y-4 border-t border-border pt-5">
                  {application.noteEntries.slice(0, 3).map((note) => (
                    <article key={note.id} className="border-l-2 border-cobalt pl-4">
                      <p className="whitespace-pre-wrap text-sm leading-6">{note.body}</p>
                      <time dateTime={note.createdAt} className="mt-2 block font-mono text-[0.6rem] uppercase tracking-[0.09em] text-muted-foreground">
                        {formatDateTime(note.createdAt)}
                      </time>
                    </article>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4 border-b border-border">
              <div>
                <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-cobalt">Audit trail</p>
                <CardTitle>Activity timeline</CardTitle>
              </div>
              <Badge variant="outline">{timeline.length} {timeline.length === 1 ? "entry" : "entries"}</Badge>
            </CardHeader>
            <CardContent className="pt-5 sm:pt-6">
              {timeline.length > 0 ? (
                <ol className="space-y-0">
                  {timeline.map((entry, index) => (
                    <li key={entry.id} className="relative border-l border-border pb-6 pl-6 last:border-transparent last:pb-0">
                      <span aria-hidden="true" className={`absolute -left-[5px] top-1 size-[9px] rounded-full border-2 border-paper ${index === 0 ? "bg-cobalt" : entry.kind === "event" ? "bg-amber" : "bg-evergreen"}`} />
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                        <p className="text-sm font-semibold text-evergreen-deep">
                          {entry.title}
                        </p>
                        <time dateTime={entry.occurredAt} className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">
                          {formatDateTime(entry.occurredAt)}
                        </time>
                      </div>
                      {entry.detail ? <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{entry.detail}</p> : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No activity is available yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-7">
          <Card>
            <CardHeader className="border-b border-border">
              <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-cobalt">Live status</p>
              <CardTitle>Current stage</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 sm:pt-6">
              <Badge variant={stageBadgeVariant(application.currentStage.category)}>{application.currentStage.name}</Badge>
              {!application.archivedAt ? (
                <StageChangeForm
                  applicationId={application.id}
                  currentStageId={application.currentStageId}
                  stages={options.stages.map((stage) => ({ ...stage, isActive: true }))}
                />
              ) : (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">Restore this file before moving it to another stage.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border">
              <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-cobalt">At a glance</p>
              <CardTitle>Case details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y divide-border">
                <MetadataItem icon={<CalendarDays />} label="Applied" value={application.appliedAt ? formatDate(application.appliedAt) : "Not applied"} />
                <MetadataItem icon={<MapPin />} label="Location" value={application.location ?? application.company.location ?? "Not specified"} />
                <MetadataItem icon={<Laptop />} label="Work mode" value={humanize(application.workMode)} />
                <MetadataItem icon={<BriefcaseBusiness />} label="Employment" value={humanize(application.employmentType)} />
                <MetadataItem icon={<Route />} label="Seniority" value={application.seniority ?? "Not specified"} />
                <MetadataItem icon={<CircleDollarSign />} label="Compensation" value={formatSalary(application)} />
                <MetadataItem icon={<Paperclip />} label="Resume" value={application.submittedResume?.name ?? "None selected"} />
                <MetadataItem icon={<Clock3 />} label="Last updated" value={formatDate(application.updatedAt)} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border">
              <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-cobalt">Related records</p>
              <CardTitle>Case contents</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 sm:pt-6">
              <div className="grid grid-cols-3 gap-2 text-center">
                <RecordCount icon={<UserRound />} value={application.contacts.length} label="Contacts" />
                <RecordCount icon={<CalendarDays />} value={application.events.length} label="Events" />
                <RecordCount icon={<NotebookText />} value={application.noteEntries.length + (application.notes ? 1 : 0)} label="Notes" />
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <ApplicationAIWorkbench
        applicationId={application.id}
        hasJobDescription={Boolean(application.rawJobDescription.trim())}
        resume={application.submittedResume
          ? { name: application.submittedResume.name }
          : null}
        savedExtraction={savedExtraction}
        savedSummary={application.aiSummary}
        history={aiHistory}
        availability={aiAvailability}
      />

      <section aria-labelledby="crm-heading" className="space-y-4">
        <div>
          <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-cobalt">
            Conversations &amp; preparation
          </p>
          <h2
            id="crm-heading"
            className="mt-1 font-display text-2xl font-semibold text-evergreen-deep"
          >
            Contacts, interviews, and notes
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Add timestamped context without replacing the original case notes.
          </p>
        </div>
        <ApplicationCrm
          applicationId={application.id}
          data={{
            contacts: application.contacts.map((contact) => ({
              id: contact.id,
              name: contact.name,
              role: contact.role,
              email: contact.email,
              phone: contact.phone,
              linkedinUrl: contact.linkedinUrl,
              notes: contact.notes,
            })),
            events: application.events.map((event) => ({
              id: event.id,
              type: event.type,
              title: event.title,
              startsAt: event.startsAt,
              endsAt: event.endsAt,
              meetingUrl: event.meetingUrl,
              location: event.location,
              notes: event.notes,
              completedAt: event.completedAt,
            })),
            notes: application.noteEntries,
          }}
        />
      </section>

      <CompanyEditor applicationId={application.id} company={application.company} />

      <Separator />

      <section aria-labelledby="record-controls-heading" className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="record-controls-heading" className="font-display text-xl font-semibold text-evergreen-deep">Record controls</h2>
          <p className="mt-1 text-sm text-muted-foreground">Archive is reversible. Permanent deletion is not.</p>
        </div>
        <ApplicationRecordActions applicationId={application.id} archived={Boolean(application.archivedAt)} />
      </section>
    </div>
  );
}

function MetadataItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3 py-4 first:pt-0 last:pb-0">
      <span aria-hidden="true" className="mt-0.5 text-muted-foreground [&_svg]:size-4 [&_svg]:stroke-[2]">{icon}</span>
      <div className="min-w-0">
        <dt className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
        <dd className="mt-1 break-words text-sm font-medium text-evergreen-deep">{value}</dd>
      </div>
    </div>
  );
}

function RecordCount({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-md border border-border bg-[#f4f6f4] px-2 py-3">
      <span aria-hidden="true" className="mx-auto block w-fit text-muted-foreground [&_svg]:size-4 [&_svg]:stroke-[2]">{icon}</span>
      <strong className="mt-2 block font-display text-xl text-evergreen-deep">{value}</strong>
      <span className="mt-0.5 block text-[0.65rem] text-muted-foreground">{label}</span>
    </div>
  );
}

function MissingSection({ icon, title, description, href, action }: { icon: ReactNode; title: string; description: string; href: string; action: string }) {
  return (
    <div className="rounded-md border border-dashed border-input bg-[#f4f6f4] p-5 text-center">
      <span className="mx-auto grid size-10 place-items-center rounded-md border border-border bg-paper text-evergreen">{icon}</span>
      <p className="mt-3 font-display text-lg font-semibold text-evergreen-deep">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      <Button asChild variant="outline" size="sm" className="mt-4"><Link href={href}>{action}</Link></Button>
    </div>
  );
}

function stageBadgeVariant(category: string): "default" | "neutral" | "success" | "warning" | "destructive" {
  if (["offer", "accepted"].includes(category)) return "success";
  if (["rejected", "withdrawn", "closed"].includes(category)) return "destructive";
  if (category === "ghosted") return "warning";
  if (["screening", "assessment", "interview"].includes(category)) return "default";
  return "neutral";
}

function humanize(value: string | null) {
  if (!value) return "Not specified";
  if (value === "onsite") return "On-site";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatSalary(application: Pick<ApplicationDetailData, "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod">) {
  if (application.salaryMin === null && application.salaryMax === null) return "Not specified";
  const number = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
  const minimum = application.salaryMin === null ? null : number.format(application.salaryMin);
  const maximum = application.salaryMax === null ? null : number.format(application.salaryMax);
  const range = minimum && maximum ? `${minimum}–${maximum}` : minimum ?? maximum;
  return `${application.salaryCurrency ?? ""} ${range}${application.salaryPeriod ? ` / ${application.salaryPeriod}` : ""}`.trim();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(value));
}

export { ApplicationDetail };
