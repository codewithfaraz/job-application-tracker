import {
  BriefcaseBusiness,
  CircleCheckBig,
  MessageSquareReply,
  Presentation,
} from "lucide-react";

import {
  ApplicationSankeyChart,
  ApplicationsOverTimeChart,
  EffectivenessChart,
} from "@/components/analytics/analytics-charts";
import { ConversionGrid } from "@/components/analytics/conversion-grid";
import { EffectivenessTable } from "@/components/analytics/effectiveness-table";
import { MetricCard } from "@/components/analytics/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAnalyticsOverview } from "@/lib/data/analytics";

export const metadata = { title: "Analytics" };

type AnalyticsPageProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    activeOnly?: string;
  }>;
};

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const query = await searchParams;
  const overview = await getAnalyticsOverview({
    from: query.from,
    to: query.to,
    includeArchived: query.activeOnly !== "true",
  });

  return (
    <div className="mx-auto w-full max-w-[96rem]">
      <header className="flex flex-col gap-6 border-b border-border pb-7 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cobalt">
            Case desk / Analytics
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-none text-evergreen-deep sm:text-5xl">
            Search performance
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Deterministic insights from your actual stage history. No AI calls are used here.
          </p>
        </div>
        <form className="grid gap-3 rounded-lg border border-border bg-paper p-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end" method="get">
          <div className="space-y-1"><Label htmlFor="analytics-from">From</Label><Input id="analytics-from" name="from" type="date" defaultValue={query.from} /></div>
          <div className="space-y-1"><Label htmlFor="analytics-to">To</Label><Input id="analytics-to" name="to" type="date" defaultValue={query.to} /></div>
          <label className="flex h-10 items-center gap-2 px-1 text-xs text-muted-foreground"><input type="checkbox" name="activeOnly" value="true" defaultChecked={query.activeOnly === "true"} /> Active only</label>
          <Button type="submit" variant="outline">Apply</Button>
        </form>
      </header>

      <section aria-labelledby="analytics-summary-heading" className="mt-7">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="analytics-summary-heading" className="font-display text-xl font-semibold text-evergreen-deep">Outcome summary</h2>
          <Badge variant="neutral">Applied cases only</Badge>
        </div>
        <div className="grid overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 sm:gap-px xl:grid-cols-4">
          <MetricCard label="Applications" value={overview.summary.applications} note="Ever entered Applied" icon={<BriefcaseBusiness />} />
          <MetricCard label="Responses" value={overview.summary.responses} note={rateNote(overview.conversions.applicationToResponse.rate, "response rate")} icon={<MessageSquareReply />} />
          <MetricCard label="Interviews" value={overview.summary.interviews} note={rateNote(overview.conversions.applicationToInterview.rate, "interview rate")} icon={<Presentation />} />
          <MetricCard label="Offers" value={overview.summary.offers} note={rateNote(overview.conversions.applicationToOffer.rate, "offer rate")} icon={<CircleCheckBig />} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">Active {overview.summary.activeApplications}</Badge>
          <Badge variant="warning">No response yet {overview.summary.noResponse}</Badge>
          <Badge variant="success">Accepted {overview.summary.accepted}</Badge>
        </div>
      </section>

      <section aria-labelledby="conversion-heading" className="mt-8">
        <div className="mb-3"><h2 id="conversion-heading" className="font-display text-xl font-semibold text-evergreen-deep">Conversions</h2><p className="mt-1 text-sm text-muted-foreground">Every percentage includes its raw sample size.</p></div>
        <ConversionGrid conversions={overview.conversions} />
      </section>

      <div className="mt-8 grid gap-7 xl:grid-cols-2">
        <Card>
          <CardHeader className="border-b border-border"><CardTitle>Applications over time</CardTitle><p className="text-sm text-muted-foreground">Monthly applied volume</p></CardHeader>
          <CardContent className="pt-5"><ApplicationsOverTimeChart data={overview.applicationsOverTime.monthly} /></CardContent>
        </Card>
        <Card>
          <CardHeader className="border-b border-border"><CardTitle>Discovery-source effectiveness</CardTitle><p className="text-sm text-muted-foreground">Applications compared with interviews</p></CardHeader>
          <CardContent className="pt-5"><EffectivenessChart data={overview.sourceEffectiveness} label="Discovery source" /></CardContent>
        </Card>
      </div>

      <section aria-labelledby="sankey-heading" className="mt-8">
        <Card>
          <CardHeader className="border-b border-border"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><CardTitle>Historical application flow</CardTitle><p className="mt-1 text-sm text-muted-foreground">Forward normalized transitions; current status alone never rewrites history.</p></div>{overview.sankey.excludedTransitions.length > 0 ? <Badge variant="warning">{overview.sankey.excludedTransitions.reduce((sum, edge) => sum + edge.value, 0)} reopened/backward moves listed below</Badge> : null}</div></CardHeader>
          <CardContent className="pt-5">
            <div className="overflow-x-auto"><ApplicationSankeyChart data={overview.sankey} /></div>
            <div className="mt-5 overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[32rem] text-left text-sm"><caption className="sr-only">Application flow counts</caption><thead><tr className="border-b border-border font-mono text-[0.6rem] uppercase tracking-[0.09em] text-muted-foreground"><th className="px-3 py-3">From</th><th className="px-3 py-3">To</th><th className="px-3 py-3 text-right">Applications</th></tr></thead><tbody>{overview.sankey.links.length === 0 ? <tr><td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">No forward transitions yet.</td></tr> : overview.sankey.links.map((link) => <tr key={`${link.source}-${link.target}`} className="border-b border-border last:border-0"><td className="px-3 py-3 capitalize">{link.source.replaceAll("_", " ")}</td><td className="px-3 py-3 capitalize">{link.target.replaceAll("_", " ")}</td><td className="px-3 py-3 text-right tabular-nums">{link.value}</td></tr>)}</tbody></table>
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="mt-8 grid gap-7 xl:grid-cols-2">
        <Card><CardHeader className="border-b border-border"><CardTitle>Found via</CardTitle><p className="text-sm text-muted-foreground">Discovery sources stay separate from submission channels.</p></CardHeader><CardContent className="pt-2"><EffectivenessTable rows={overview.sourceEffectiveness} dimensionLabel="Source" /></CardContent></Card>
        <Card><CardHeader className="border-b border-border"><CardTitle>Applied through</CardTitle><p className="text-sm text-muted-foreground">Observed results by actual application channel.</p></CardHeader><CardContent className="pt-2"><EffectivenessTable rows={overview.channelEffectiveness} dimensionLabel="Channel" /></CardContent></Card>
      </div>
    </div>
  );
}

function rateNote(rate: number | null, label: string) {
  return rate === null ? `No ${label} yet` : `${(rate * 100).toFixed(1)}% ${label}`;
}
