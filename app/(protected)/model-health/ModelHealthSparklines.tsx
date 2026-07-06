"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { ModelRun } from "@/lib/types";
import { fmtPct } from "@/lib/utils";

interface Props {
  runs: ModelRun[];
  color: string;
}

export function ModelHealthSparklines({ runs, color }: Props) {
  if (runs.length < 2) {
    return (
      <div className="flex items-center justify-center h-[140px] text-gray-400 text-sm">
        {runs.length === 1
          ? "Solo 1 run — necesitas 2+ para ver tendencia."
          : "Sin runs publicados."}
      </div>
    );
  }

  const data = [...runs]
    .sort((a, b) => a.run_date.localeCompare(b.run_date))
    .map((r) => ({
      fecha: r.data_through.slice(0, 7),
      attrib: r.attrib_mkt,
    }));

  const baseline = data[0]?.attrib ?? 0;
  const upper = baseline + 3;
  const lower = baseline - 3;

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="fecha"
          tick={{ fill: "#9ca3af", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[Math.max(0, lower - 2), upper + 2]}
          tick={{ fill: "#9ca3af", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: 11,
          }}
          formatter={(v) => [fmtPct(v as number, 1), "Atrib. Mkt"]}
        />
        <ReferenceLine
          y={upper}
          stroke="#E60018"
          strokeDasharray="3 2"
          strokeWidth={1}
          label={{ value: "+3pp", fill: "#E60018", fontSize: 9, position: "right" }}
        />
        <ReferenceLine
          y={lower}
          stroke="#E60018"
          strokeDasharray="3 2"
          strokeWidth={1}
          label={{ value: "-3pp", fill: "#E60018", fontSize: 9, position: "right" }}
        />
        <Line
          type="monotone"
          dataKey="attrib"
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, fill: color }}
          activeDot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
