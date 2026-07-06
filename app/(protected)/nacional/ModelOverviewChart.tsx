"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TimeSeriesRow } from "@/lib/types";
import { fmtNum } from "@/lib/utils";

interface Props {
  series: TimeSeriesRow[];
}

export function ModelOverviewChart({ series }: Props) {
  if (!series.length) {
    return (
      <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">
        Sin datos de serie de tiempo.
      </div>
    );
  }

  const data = series.map((r) => ({
    fecha: r.week_date.slice(0, 10),
    Observado: r.obs,
    Ajustado: r.fitted,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="fecha"
          tick={{ fill: "#9ca3af", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickCount={8}
        />
        <YAxis
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => fmtNum(v)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: 12,
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
          }}
          formatter={(v) => [fmtNum(v as number), undefined]}
        />
        <Legend
          iconType="line"
          wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 12 }}
        />
        <Line
          type="monotone"
          dataKey="Observado"
          stroke="#111827"
          strokeWidth={1.5}
          dot={false}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="Ajustado"
          stroke="#006729"
          strokeWidth={1.5}
          dot={false}
          strokeDasharray="5 3"
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
