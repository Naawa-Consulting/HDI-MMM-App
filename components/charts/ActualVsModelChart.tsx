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

interface Props {
  data: TimeSeriesRow[];
  color: string;
}

function fmtWeek(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("es-MX", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function fmtNum(v: number) {
  return v.toLocaleString("es-MX", { maximumFractionDigits: 0 });
}

export function ActualVsModelChart({ data, color }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">
        Sin datos de series de tiempo.
      </div>
    );
  }

  // Show every ~13th tick (quarterly) to avoid crowding
  const tickInterval = Math.max(1, Math.floor(data.length / 16));
  const chartData = data
    .filter((r) => r.obs !== null || r.fitted !== null)
    .map((r) => ({
      week: r.week_date,
      label: fmtWeek(r.week_date),
      obs: r.obs ?? undefined,
      ajuste: r.fitted ?? undefined,
    }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={chartData}
        margin={{ top: 8, right: 16, left: -4, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="label"
          tick={{ fill: "#9ca3af", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval={tickInterval}
        />
        <YAxis
          tick={{ fill: "#9ca3af", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => fmtNum(v)}
          width={52}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: 11,
          }}
          formatter={(v, name) => [
            fmtNum(Number(v ?? 0)),
            name === "obs" ? "Observado" : "Ajuste modelo",
          ]}
          labelFormatter={(l) => `Semana ${l}`}
        />
        <Legend
          formatter={(value) =>
            value === "obs" ? "Observado" : "Ajuste modelo"
          }
          wrapperStyle={{ fontSize: 11 }}
        />
        <Line
          type="monotone"
          dataKey="obs"
          stroke="#374151"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="ajuste"
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray="5 3"
          dot={false}
          activeDot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
