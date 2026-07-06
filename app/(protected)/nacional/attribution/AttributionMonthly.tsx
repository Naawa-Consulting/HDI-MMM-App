"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyScenario } from "@/lib/types";
import { fmtNum } from "@/lib/utils";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
                       "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

interface Props {
  monthly: MonthlyScenario[];
}

export function AttributionMonthly({ monthly }: Props) {
  const years = [...new Set(monthly.map((m) => m.year))].sort();
  const [year, setYear] = useState(years[years.length - 1] ?? 2025);

  const data = monthly
    .filter((m) => m.year === year)
    .sort((a, b) => a.month - b.month)
    .map((m) => ({
      mes: MONTH_LABELS[m.month - 1],
      Baseline: m.base,
      "Mkt. Real": m.mkt_act,
      "Mkt. Plan": m.mkt_opt,
    }));

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {years.map((y) => (
          <button
            key={y}
            onClick={() => setYear(y)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              year === y
                ? "bg-[#006729] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">
          Sin datos para {year}.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradBase2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#003960" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#003960" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradMkt2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#65A518" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#65A518" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="mes"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
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
              }}
              formatter={(v) => [fmtNum(v as number), undefined]}
            />
            <Legend
              iconType="square"
              wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 12 }}
            />
            <Area
              type="monotone"
              dataKey="Baseline"
              stackId="1"
              stroke="#003960"
              fill="url(#gradBase2)"
              strokeWidth={1.5}
              connectNulls
            />
            <Area
              type="monotone"
              dataKey="Mkt. Real"
              stackId="1"
              stroke="#65A518"
              fill="url(#gradMkt2)"
              strokeWidth={1.5}
              connectNulls
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
