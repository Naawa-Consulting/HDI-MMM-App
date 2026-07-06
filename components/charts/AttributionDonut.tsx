"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { AttributionBlock } from "@/lib/types";
import { fmtPct } from "@/lib/utils";

const BLOCK_COLORS: Record<string, string> = {
  marketing:    "#65A518",
  tendencia:    "#003960",
  estacionalidad:"#4CBFC2",
  mercado:      "#4C7490",
  calendario:   "#809CB0",
  otros:        "#B3C3D0",
};

const BLOCK_LABELS: Record<string, string> = {
  marketing:     "Marketing",
  tendencia:     "Tendencia",
  estacionalidad:"Estacionalidad",
  mercado:       "Mercado",
  calendario:    "Calendario",
  otros:         "Otros",
};

function getColor(block: string): string {
  for (const key of Object.keys(BLOCK_COLORS)) {
    if (block.toLowerCase().includes(key)) return BLOCK_COLORS[key];
  }
  return "#d1d5db";
}

interface Props {
  blocks: AttributionBlock[];
  size?: number;
}

export function AttributionDonut({ blocks, size = 260 }: Props) {
  const data = blocks
    .filter((b) => b.pct > 0)
    .map((b) => ({
      name: BLOCK_LABELS[b.block] ?? b.block,
      value: Math.round(b.pct * 10) / 10,
      color: getColor(b.block),
    }));

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">
        Sin datos
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={size}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="75%"
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} stroke="none" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: 12,
          }}
          formatter={(v) => [`${v}%`, undefined]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: "#6b7280" }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
