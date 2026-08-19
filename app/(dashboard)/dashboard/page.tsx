import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CircleCheckBig,
  MessageSquareReply,
  Presentation,
} from "lucide-react";
import Link from "next/link";

import { ApplicationsOverTimeChart } from "@/components/analytics/analytics-charts";
import { MetricCard } from "@/components/analytics/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getDashboardOverview } from "@/lib/data/analytics";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const overview = await getDashboardOverview();
  const hasApplications = overview.summary.applications > 0;
  const eventFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: overview.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="mx-auto w-full max-w-[86rem]">
      <header className="flex flex-col gap-6 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cobalt">Case desk / Overview</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-none text-evergreen-deep sm:text-5xl">Your application desk</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">A live summary derived from your application and stage history.</p>
        </div>
        <Button asChild size="lg"><Link href="/applications/new">Add application <span aria-hidden="true">+</span></Link></Button>
      </header>

      <section aria-labelledby="metrics-heading" className="mt-7">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="metrics-heading" className="font-display text-xl font-semibold text-evergreen-deep">Search at a glance</h2>
          <div className="flex gap-2"><Badge variant="outline">Active {overview.summary.activeApplications}</Badge><Badge variant="warning">No response {overview.summary.noResponse}</Badge></div>
        </div>
        <div className="grid overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 sm:gap-px xl:grid-cols-4">
          <MetricCard label="Applications" value={overview.summary.applications} note="Ever reached Applied" icon={<BriefcaseBusiness />} />
          <MetricCard label="Responses" value={overview.summary.responses} note={rateNote(overview.conversions.applicationToResponse.rate)} icon={<MessageSquareReply />} />
          <MetricCard label="Interviews" value={overview.summary.interviews} note={rateNote(overview.conversions.applicationToInterview.rate)} icon={<Presentation />} />
          <MetricCard label="Offers" value={overview.summary.offers} note={rateNote(overview.conversions.applicationToOffer.rate)} icon={<CircleCheckBig />} />
        </div>
      </section>

      {!hasApplications ? (
        <EmptyState eyebrow="Your first case file" title="Add an application to begin" description="Start with a company and role, then paste the job description when you have it. Every other detail can wait." icon={<BriefcaseBusiness />} action={<Button asChild><Link href="/applications/new">Add application</Link></Button>} className="mt-7 min-h-[22rem]" />
      ) : (
        <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
          <div className="space-y-7">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-4 border-b border-border"><div><CardTitle>Application rhythm</CardTitle><p className="mt-1 text-sm text-muted-foreground">Monthly applied volume</p></div><Button asChild size="sm" variant="ghost"><Link href="/analytics">Full analytics <ArrowRight /></Link></Button></CardHeader>
              <CardContent className="pt-5"><ApplicationsOverTimeChart data={overview.applicationsOverTime.monthly} /></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-4 border-b border-border"><div><CardTitle>Active pipeline</CardTitle><p className="mt-1 text-sm text-muted-foreground">Current, non-archived cases by stage</p></div><Button asChild size="sm" variant="ghost"><Link href="/pipeline">Open pipeline <ArrowRight /></Link></Button></CardHeader>
              <CardContent className="pt-5"><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{overview.currentPipeline.stages.filter((stage) => stage.count > 0).map((stage) => <div key={stage.stageId} className="rounded-md border border-border bg-[#f4f6f4] p-4"><p className="truncate text-xs font-semibold text-muted-foreground">{stage.name}</p><p className="mt-2 font-display text-3xl font-semibold text-evergreen-deep">{stage.count}</p></div>)}</div></CardContent>
            </Card>
          </div>

          <aside className="space-y-7">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3 border-b border-border"><div><CardTitle>Upcoming</CardTitle><p className="mt-1 text-sm text-muted-foreground">Next interviews and calls</p></div><CalendarClock className="size-5 text-cobalt" /></CardHeader>
              <CardContent className="pt-5">
                {overview.upcomingInterviews.length === 0 ? <p className="rounded-md border border-dashed border-input p-5 text-center text-sm leading-6 text-muted-foreground">No upcoming interviews scheduled.</p> : <ol className="space-y-4">{overview.upcomingInterviews.slice(0, 5).map((event) => <li key={event.id} className="border-l-2 border-cobalt pl-4"><time dateTime={event.startsAt} className="font-mono text-[0.6rem] uppercase tracking-[0.08em] text-muted-foreground">{eventFormatter.format(new Date(event.startsAt))}</time><Link href={`/applications/${event.applicationId}`} className="mt-1 block font-semibold text-evergreen-deep hover:text-cobalt">{event.companyName} · {event.title}</Link><p className="mt-0.5 text-xs text-muted-foreground">{event.applicationTitle}</p></li>)}</ol>}
                <Button asChild variant="outline" className="mt-5 w-full"><Link href="/calendar">View calendar</Link></Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="border-b border-border"><CardTitle>What is working</CardTitle><p className="mt-1 text-sm text-muted-foreground">Observed outcomes, not causal claims</p></CardHeader>
              <CardContent className="space-y-5 pt-5"><EffectivenessSpotlight label="Most-used discovery source" row={overview.sourceEffectiveness[0]} /><EffectivenessSpotlight label="Most-used application channel" row={overview.channelEffectiveness[0]} /></CardContent>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}

function rateNote(rate: number | null) {
  return rate === null ? "No rate yet" : `${(rate * 100).toFixed(1)}% of applications`;
}

function EffectivenessSpotlight({ label, row }: { label: string; row: { name: string; applications: number; interviews: number } | undefined }) {
  return <div><p className="font-mono text-[0.6rem] font-semibold uppercase tracking-[0.09em] text-muted-foreground">{label}</p>{row ? <><p className="mt-1 font-semibold text-evergreen-deep">{row.name}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{row.interviews} interviews from {row.applications} applications</p></> : <p className="mt-1 text-sm text-muted-foreground">Not enough data yet.</p>}</div>;
}
