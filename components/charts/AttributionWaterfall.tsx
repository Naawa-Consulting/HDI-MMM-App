"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { AttributionBlock } from "@/lib/types";

// ─── constants ───────────────────────────────────────────────────────────────

const BLOCK_ORDER = ["mercado_tendencia", "agentes", "marketing", "estacionalidad"];

const BLOCK_LABELS: Record<string, string> = {
  mercado_tendencia: "Baseline",
  agentes:           "Agentes",
  marketing:         "Marketing",
  estacionalidad:    "Estacionalidad",
  total:             "Total",
};

const BLOCK_COLORS: Record<string, string> = {
  mercado_tendencia: "#003960",
  agentes:           "#4C7490",
  marketing:         "#65A518",
  estacionalidad:    "#B3C3D0",
  total:             "#1f2937",
};

// ─── data transform ──────────────────────────────────────────────────────────

interface WaterfallRow {
  name: string;
  block: string;
  base: number;
  value: number;
  pct: number;
  cot: number | null;
  color: string;
  isNegative: boolean;
  isTotal: boolean;
}

function buildWaterfallData(
  blocks: AttributionBlock[],
  totalCot: number | null
): WaterfallRow[] {
  const map = Object.fromEntries(blocks.map((b) => [b.block, b.pct]));
  let running = 0;

  const rows: WaterfallRow[] = BLOCK_ORDER.filter((k) => k in map).map((k) => {
    const pct = map[k];
    const start = running;
    running += pct;
    return {
      name:       BLOCK_LABELS[k] ?? k,
      block:      k,
      base:       pct >= 0 ? start : start + pct,
      value:      Math.abs(pct),
      pct,
      cot:        totalCot != null ? Math.round((pct / 100) * totalCot) : null,
      color:      BLOCK_COLORS[k] ?? "#9ca3af",
      isNegative: pct < 0,
      isTotal:    false,
    };
  });

  // Total bar — full column from 0 to 100
  rows.push({
    name:       "Total",
    block:      "total",
    base:       0,
    value:      100,
    pct:        100,
    cot:        totalCot != null ? Math.round(totalCot) : null,
    color:      BLOCK_COLORS.total,
    isNegative: false,
    isTotal:    true,
  });

  return rows;
}

// ─── custom tooltip ──────────────────────────────────────────────────────────

const NUM_FMT = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });

function WaterfallTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: WaterfallRow }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const sign = d.pct < 0 ? "" : d.isTotal ? "" : "+";
  const pctColor = d.pct < 0 ? "#ef4444" : d.isTotal ? BLOCK_COLORS.total : d.color;

  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        minWidth: 160,
      }}
    >
      <p className="font-semibold text-gray-900 mb-1">{d.name}</p>
      <p style={{ color: pctColor, marginBottom: 2 }}>
        {sign}{d.pct.toFixed(2)}% de cotizaciones
      </p>
      {d.cot != null && (
        <p className="text-gray-500">
          {NUM_FMT.format(d.cot)} cotizaciones
        </p>
      )}
    </div>
  );
}

// ─── custom label above/below bar ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarPctLabel(props: any) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const width = Number(props.width ?? 0);
  const height = Number(props.height ?? 0);
  const value = props.value != null ? Number(props.value) : null;
  if (value == null || width < 24) return null;
  const labelY = value >= 0 ? y - 6 : y + height + 14;
  return (
    <text
      x={x + width / 2}
      y={labelY}
      textAnchor="middle"
      fill={value < 0 ? "#ef4444" : "#374151"}
      fontSize={11}
      fontWeight={600}
    >
      {value === 100 ? "100%" : (value >= 0 ? "+" : "") + value.toFixed(1) + "%"}
    </text>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

interface Props {
  blocks: AttributionBlock[];
  totalCot?: number | null;
}

export function AttributionWaterfall({ blocks, totalCot = null }: Props) {
  if (!blocks.length) return null;

  const data = buildWaterfallData(blocks, totalCot);

  return (
    <div className="flex items-stretch gap-1">
      {/* Y axis title as HTML — avoids Recharts margin whitespace */}
      <span
        className="text-[10px] text-gray-400 shrink-0 select-none"
        style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", textAlign: "center" }}
      >
        Contribución (%)
      </span>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={data}
          margin={{ top: 24, right: 16, left: 0, bottom: 0 }}
          barCategoryGap="28%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            domain={[
              (min: number) => Math.min(min, 0) - 5,
              (max: number) => max + 8,
            ]}
          />
          <Tooltip content={<WaterfallTooltip />} cursor={{ fill: "#f9fafb" }} />

          {/* Transparent spacer — lifts the colored bar to the correct position */}
          <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />

          {/* Colored contribution bar */}
          <Bar
            dataKey="value"
            stackId="wf"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell key={d.block} fill={d.color} />
            ))}
            <LabelList dataKey="pct" content={BarPctLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
