import { AlertTriangle, CheckCircle2, Lightbulb, SearchCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ResumeComparison } from "@/lib/ai/schemas";

function ResumeComparisonArtifact({ data }: { data: ResumeComparison }) {
  return (
    <div className="space-y-6">
      <div className="border-l-2 border-cobalt pl-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={matchVariant(data.matchStrength)}>
            {data.matchStrength}
          </Badge>
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.09em] text-muted-foreground">
            Qualitative fit
          </span>
        </div>
        <p className="mt-3 text-sm leading-7 text-foreground">{data.summary}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ArtifactSection
          title="Aligned strengths"
          icon={<CheckCircle2 aria-hidden="true" />}
        >
          {data.alignedStrengths.length > 0 ? (
            <ul className="space-y-3">
              {data.alignedStrengths.map((item) => (
                <li key={`${item.requirement}-${item.evidence}`} className="rounded-md border border-border bg-paper p-3">
                  <p className="text-sm font-semibold text-evergreen-deep">
                    {item.requirement}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {item.evidence}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyArtifactCopy>No direct strengths were identified.</EmptyArtifactCopy>
          )}
        </ArtifactSection>

        <ArtifactSection
          title="Gaps to address"
          icon={<AlertTriangle aria-hidden="true" />}
        >
          {data.gaps.length > 0 ? (
            <ul className="space-y-3">
              {data.gaps.map((item) => (
                <li key={`${item.requirement}-${item.impact}`} className="rounded-md border border-border bg-paper p-3">
                  <p className="text-sm font-semibold text-evergreen-deep">
                    {item.requirement}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {item.impact}
                  </p>
                  <p className="mt-2 border-l-2 border-amber pl-2 text-xs leading-5 text-foreground">
                    {item.suggestedAction}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyArtifactCopy>No material gaps were identified.</EmptyArtifactCopy>
          )}
        </ArtifactSection>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        <ListBlock title="Transferable skills" values={data.transferableSkills} />
        <ListBlock title="Keywords to consider" values={data.keywordsToConsider} />
        <ListBlock title="Recommended next steps" values={data.recommendations} ordered />
      </div>

      {data.caveats.length > 0 ? (
        <div className="rounded-md border border-dashed border-input bg-[#f4f6f4] p-4">
          <p className="inline-flex items-center gap-2 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
            <SearchCheck aria-hidden="true" className="size-4" strokeWidth={2} />
            Limits of this comparison
          </p>
          <ul className="mt-2 space-y-1.5 text-xs leading-5 text-muted-foreground">
            {data.caveats.map((caveat) => <li key={caveat}>— {caveat}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ArtifactSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="flex items-center gap-2 font-display text-lg font-semibold text-evergreen-deep [&_svg]:size-4 [&_svg]:stroke-[2] [&_svg]:text-cobalt">
        {icon}{title}
      </h4>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function ListBlock({ title, values, ordered = false }: { title: string; values: string[]; ordered?: boolean }) {
  const List = ordered ? "ol" : "ul";
  return (
    <div className="rounded-md border border-border bg-[#f4f6f4] p-4">
      <p className="inline-flex items-center gap-2 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
        <Lightbulb aria-hidden="true" className="size-3.5" strokeWidth={2} />{title}
      </p>
      {values.length > 0 ? (
        <List className="mt-3 space-y-2 text-sm leading-6">
          {values.map((value, index) => (
            <li key={value} className="flex gap-2">
              <span className="shrink-0 font-mono text-[0.62rem] font-semibold text-cobalt">
                {ordered ? String(index + 1).padStart(2, "0") : "•"}
              </span>
              <span>{value}</span>
            </li>
          ))}
        </List>
      ) : <p className="mt-3 text-xs text-muted-foreground">None identified.</p>}
    </div>
  );
}

function EmptyArtifactCopy({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-input p-4 text-xs text-muted-foreground">{children}</p>;
}

function matchVariant(value: ResumeComparison["matchStrength"]): "success" | "warning" | "destructive" {
  if (value === "Strong Match") return "success";
  if (value === "Moderate Match") return "warning";
  return "destructive";
}

export { ResumeComparisonArtifact };
