import type { EffectivenessRow } from "@/lib/analytics";

function rate(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

export function EffectivenessTable({
  rows,
  dimensionLabel,
}: {
  rows: EffectivenessRow[];
  dimensionLabel: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          Application results grouped by {dimensionLabel.toLowerCase()}
        </caption>
        <thead>
          <tr className="border-b border-border font-mono text-[0.6rem] uppercase tracking-[0.09em] text-muted-foreground">
            <th scope="col" className="px-3 py-3 font-semibold">{dimensionLabel}</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">Applied</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">Responses</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">Interviews</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">Offers</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No applied applications in this range.</td></tr>
          ) : rows.map((row) => (
            <tr key={row.dimensionId ?? row.name} className="border-b border-border/80 last:border-b-0">
              <th scope="row" className="px-3 py-3 font-semibold text-evergreen-deep">{row.name}</th>
              <td className="px-3 py-3 text-right tabular-nums">{row.applications}</td>
              <td className="px-3 py-3 text-right tabular-nums">{row.responses} <span className="text-xs text-muted-foreground">({rate(row.responseRate)})</span></td>
              <td className="px-3 py-3 text-right tabular-nums">{row.interviews} <span className="text-xs text-muted-foreground">({rate(row.interviewRate)})</span></td>
              <td className="px-3 py-3 text-right tabular-nums">{row.offers} <span className="text-xs text-muted-foreground">({rate(row.offerRate)})</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
