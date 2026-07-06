"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { OptimizationRun } from "@/lib/types";
import { fmtPct } from "@/lib/utils";

// Channel → brand color mapping (consistent with CHART_COLORS in utils.ts)
const CHANNEL_COLORS: Record<string, string> = {
  "YouTube Branding": "#E60018",
  "YouTube":          "#E60018",
  "OOH Cartelera":    "#003960",
  "OOH":              "#003960",
  "Programmatic":     "#00A3A8",
  "Display (Prog+CTV)": "#00A3A8",
  "CTV":              "#4CBFC2",
  "Radio":            "#809CB0",
  "PR":               "#65A518",
  "OOH Camion":       "#B3C3D0",
  "Meta":             "#93C05D",
  "Search/SEM":       "#4C7490",
};

const FALLBACK_COLORS = [
  "#003960", "#65A518", "#00A3A8", "#E60018",
  "#4CBFC2", "#809CB0", "#B3C3D0", "#93C05D",
];

function getColor(canal: string, index: number): string {
  return CHANNEL_COLORS[canal] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

interface Props {
  runs:    OptimizationRun[];
  variant: "ref" | "opt";
  title:   string;
}

export function OptimizationMixDonut({ runs, variant, title }: Props) {
  const modeled = runs.filter((r) => r.is_modeled);

  const data = modeled
    .map((r) => ({
      name:  r.canal,
      value: variant === "ref" ? (r.ref_mix ?? 0) : (r.opt_mix ?? 0),
    }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  if (!data.length) return null;

  return (
    <div className="flex flex-col items-center">
      <p className="text-sm font-semibold text-gray-700 mb-1">{title}</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="42%"
            innerRadius={52}
            outerRadius={78}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={getColor(entry.name, i)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(v) => [`${fmtPct(v as number, 1)}`, "Mix"]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(v, _, i) =>
              `${v}  ${fmtPct(data[i as number]?.value ?? 0, 0)}`
            }
            wrapperStyle={{ fontSize: 11, color: "#4b5563" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
