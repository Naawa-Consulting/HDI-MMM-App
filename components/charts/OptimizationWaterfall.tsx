"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { OptimizationRun } from "@/lib/types";
import { fmtMXN } from "@/lib/utils";

interface Props {
  runs: OptimizationRun[];
}

export function OptimizationWaterfall({ runs }: Props) {
  const data = runs
    .filter((r) => r.ref_sp != null && r.opt_sp != null)
    .map((r) => ({
      canal: r.canal,
      delta: Math.round(((r.opt_sp ?? 0) - (r.ref_sp ?? 0))),
      isActive: r.is_active,
    }))
    .sort((a, b) => b.delta - a.delta);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">
        Sin datos
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 48, left: 88, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => fmtMXN(v)}
        />
        <YAxis
          type="category"
          dataKey="canal"
          tick={{ fill: "#374151", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={84}
        />
        <ReferenceLine x={0} stroke="#e5e7eb" strokeWidth={1} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: 12,
          }}
          formatter={(v) => [fmtMXN(v as number), "Cambio"]}
        />
        <Bar dataKey="delta" radius={[0, 2, 2, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={
                !entry.isActive
                  ? "#e5e7eb"
                  : entry.delta >= 0
                  ? "#65A518"
                  : "#E60018"
              }
              opacity={entry.isActive ? 1 : 0.5}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
