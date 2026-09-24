"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";
import type { MonthlyScenario } from "@/lib/types";
import { fmtNum } from "@/lib/utils";

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

function buildChartData(scenarios: MonthlyScenario[], years: number[], months: number[]) {
  const multiYear = years.length > 1;
  return scenarios
    .filter((s) => years.includes(s.year) && s.obs != null && (months.length === 0 || months.includes(s.month)))
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .map((s) => {
      // Baseline agrupa todo lo que no es marketing (base + agentes + estacionalidad)
      // para que sume exactamente "obs" junto con Marketing -- mismo criterio que
      // el reescalado de monthly_scenarios (2026-08-24).
      const baseline = (s.base ?? 0) + (s.agentes ?? 0) + (s.estac ?? 0);
      const denom = s.obs ?? (baseline + (s.mkt_act ?? 0));
      const mktPct =
        denom > 0 && s.mkt_act != null
          ? Math.round((s.mkt_act / denom) * 100)
          : null;
      return {
        mes: multiYear
          ? `${MONTH_LABELS[s.month - 1]} '${String(s.year).slice(2)}`
          : MONTH_LABELS[s.month - 1],
        Baseline: baseline,
        Marketing: s.mkt_act ?? null,
        mktPct,
      };
    });
}

// Custom label rendered inside the Marketing bar segment
function MktLabel({
  x,
  y,
  width,
  height,
  value,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number | null;
}) {
  if (value == null || (height ?? 0) < 18 || (width ?? 0) < 20) return null;
  return (
    <text
      x={(x ?? 0) + (width ?? 0) / 2}
      y={(y ?? 0) + (height ?? 0) / 2}
      textAnchor="middle"
      dominantBaseline="central"
      fill="white"
      fontSize={10}
      fontWeight={600}
    >
      {`${value}%`}
    </text>
  );
}

interface DashboardChartsProps {
  monthlyNacional: MonthlyScenario[];
  monthlyCdmx: MonthlyScenario[];
  selectedYears: number[];
  selectedMonths: number[];
}

export function DashboardCharts({
  monthlyNacional,
  monthlyCdmx,
  selectedYears,
  selectedMonths,
}: DashboardChartsProps) {
  const [scope, setScope] = useState<"nacional" | "cdmx">("cdmx");

  const monthly = scope === "nacional" ? monthlyNacional : monthlyCdmx;
  const data = buildChartData(monthly, selectedYears, selectedMonths);

  const hasData = data.some(
    (d) => d.Baseline != null || d.Marketing != null
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-gray-900 font-semibold">
            Evolucion mensual de cotizaciones
          </h3>
          <p className="text-gray-500 text-xs mt-0.5">
            Baseline + contribucion de marketing (% sobre el total mensual)
          </p>
        </div>

        <div className="flex rounded-lg bg-gray-100 border border-gray-200 overflow-hidden text-xs">
          {(["nacional", "cdmx"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`px-3 py-1.5 transition-colors ${
                scope === s
                  ? "bg-[#006729] text-white font-medium"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {s === "nacional" ? "Nacional" : "CDMX"}
            </button>
          ))}
        </div>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 50, bottom: 0 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={selectedYears.length > 1 ? 2 : 0}
            />
            <YAxis
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => fmtNum(v)}
              label={{
                value: "Cotizaciones",
                angle: -90,
                position: "insideLeft",
                offset: -35,
                style: { fill: "#9ca3af", fontSize: 11 },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                color: "#111827",
                fontSize: 12,
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              }}
              formatter={(value, name) => [
                fmtNum(value as number),
                name,
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 12 }}
            />
            <Bar
              dataKey="Baseline"
              stackId="cotiz"
              fill="#e5e7eb"
              radius={[0, 0, 4, 4]}
            />
            <Bar
              dataKey="Marketing"
              stackId="cotiz"
              fill="#65A518"
              radius={[4, 4, 0, 0]}
            >
              <LabelList dataKey="mktPct" content={<MktLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
          Sin datos mensuales para el periodo seleccionado.
        </div>
      )}
    </div>
  );
}
