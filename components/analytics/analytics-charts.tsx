"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Sankey,
  Tooltip,
  XAxis,
  YAxis,
  type SankeyNodeProps,
} from "recharts";

import type {
  EffectivenessRow,
  SankeyData,
  TimeBucket,
} from "@/lib/analytics";

const tooltipStyle = {
  background: "#fbfcfb",
  border: "1px solid #d2d9d5",
  borderRadius: "6px",
  color: "#172923",
  fontSize: "12px",
};

export function ApplicationsOverTimeChart({ data }: { data: TimeBucket[] }) {
  if (data.length === 0) return <ChartEmpty />;

  return (
    <div className="h-72 w-full" role="img" aria-label="Applications by month line chart">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 14, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="#d2d9d5" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#68766f" }} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#68766f" }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="count" name="Applications" stroke="#315ccf" strokeWidth={2.5} dot={{ r: 3, fill: "#315ccf" }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EffectivenessChart({
  data,
  label,
}: {
  data: EffectivenessRow[];
  label: string;
}) {
  const visible = data.slice(0, 8);
  if (visible.length === 0) return <ChartEmpty />;

  return (
    <div className="h-80 w-full" role="img" aria-label={`${label} application and interview counts`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={visible} layout="vertical" margin={{ top: 4, right: 10, bottom: 0, left: 22 }}>
          <CartesianGrid stroke="#d2d9d5" strokeDasharray="3 4" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#68766f" }} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="name" width={92} tick={{ fontSize: 10, fill: "#68766f" }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Bar dataKey="applications" name="Applications" fill="#173f35" radius={[0, 3, 3, 0]} />
          <Bar dataKey="interviews" name="Interviews" fill="#315ccf" radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SankeyNode({ x, y, width, height, payload }: SankeyNodeProps) {
  const name = typeof payload.name === "string" ? payload.name : "Stage";
  const labelOnLeft = x > 360;
  return (
    <g>
      <rect x={x} y={y} width={width} height={Math.max(height, 3)} rx={2} fill="#173f35" />
      <text
        x={labelOnLeft ? x - 7 : x + width + 7}
        y={y + Math.max(height, 3) / 2}
        dy="0.35em"
        textAnchor={labelOnLeft ? "end" : "start"}
        fill="#172923"
        fontSize={11}
      >
        {name}
      </text>
    </g>
  );
}

export function ApplicationSankeyChart({ data }: { data: SankeyData }) {
  if (data.links.length === 0) return <ChartEmpty />;

  const indices = new Map(data.nodes.map((node, index) => [node.id, index]));
  const chartData = {
    nodes: data.nodes.map((node) => ({ name: node.name })),
    links: data.links.flatMap((link) => {
      const source = indices.get(link.source);
      const target = indices.get(link.target);
      return source === undefined || target === undefined
        ? []
        : [{ source, target, value: link.value }];
    }),
  };

  return (
    <div className="h-[26rem] min-w-[44rem]" role="img" aria-label="Historical application stage flow Sankey diagram">
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={chartData}
          node={(props) => <SankeyNode {...props} />}
          nodePadding={22}
          nodeWidth={10}
          link={{ stroke: "#315ccf", strokeOpacity: 0.32 }}
          margin={{ top: 18, right: 110, bottom: 18, left: 90 }}
        >
          <Tooltip contentStyle={tooltipStyle} />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}

function ChartEmpty() {
  return (
    <div className="grid h-64 place-items-center rounded-md border border-dashed border-input bg-[#f4f6f4] p-6 text-center">
      <p className="max-w-xs text-sm leading-6 text-muted-foreground">
        Not enough historical data yet. Add and progress a few applications to populate this view.
      </p>
    </div>
  );
}
