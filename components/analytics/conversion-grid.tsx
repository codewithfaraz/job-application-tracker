import type { ConversionMetrics, RateMetric } from "@/lib/analytics";

const labels: Array<[keyof ConversionMetrics, string]> = [
  ["applicationToResponse", "Application → response"],
  ["applicationToScreening", "Application → screening"],
  ["applicationToInterview", "Application → interview"],
  ["applicationToOffer", "Application → offer"],
  ["interviewToOffer", "Interview → offer"],
  ["offerToAccepted", "Offer → accepted"],
];

function formatMetric(metric: RateMetric) {
  return metric.rate === null ? "—" : `${(metric.rate * 100).toFixed(1)}%`;
}

export function ConversionGrid({ conversions }: { conversions: ConversionMetrics }) {
  return (
    <div className="grid overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3 sm:gap-px">
      {labels.map(([key, label]) => {
        const metric = conversions[key];
        return (
          <article key={key} className="bg-card p-5">
            <p className="text-xs font-semibold text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-evergreen-deep">{formatMetric(metric)}</p>
            <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
              {metric.numerator} of {metric.denominator}
            </p>
          </article>
        );
      })}
    </div>
  );
}
