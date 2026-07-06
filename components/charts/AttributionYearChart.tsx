"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { RoiByYear } from "@/lib/types";
import { fmtNum, fmtMXN, fmtRoas } from "@/lib/utils";

// ─── tooltip ─────────────────────────────────────────────────────────────────

function YearTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: RoiByYear }[];
}) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div
      style={{
        backgroundColor: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
      }}
    >
      <p className="font-semibold text-gray-900 mb-1">
        {r.year}
        {r.is_partial && " (parcial)"}
      </p>
      <p className="text-gray-600">
        Cotizaciones de marketing:{" "}
        <span className="font-medium text-gray-900">{fmtNum(r.mkt_cot)}</span>
      </p>
      <p className="text-gray-600">
        Atribución de marketing:{" "}
        <span className="font-medium" style={{ color: "#65A518" }}>
          {r.attrib_pct != null ? `${r.attrib_pct.toFixed(1)}%` : "—"}
        </span>
      </p>
      {r.inv != null && (
        <p className="text-gray-600">
          Inversión:{" "}
          <span className="font-medium text-gray-900">{fmtMXN(r.inv)}</span>
        </p>
      )}
      {r.roas != null && (
        <p className="text-gray-600">
          ROAS:{" "}
          <span className="font-medium" style={{ color: "#00A3A8" }}>
            {fmtRoas(r.roas)}
          </span>
        </p>
      )}
    </div>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

interface Props {
  roi: RoiByYear[];
}

export function AttributionYearChart({ roi }: Props) {
  if (!roi.length) return null;

  const data = [...roi].sort((a, b) => a.year - b.year);
  const hasRoas = data.some((r) => r.roas != null);

  return (
    <div>
      <div className="flex items-stretch gap-1">
        {/* Left Y axis title */}
        <span
          className="text-[10px] text-gray-400 shrink-0 select-none"
          style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", textAlign: "center" }}
        >
          Atribución de marketing (%)
        </span>

        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart
            data={data}
            margin={{ top: 12, right: 8, left: 0, bottom: 0 }}
            barCategoryGap="32%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => {
                const r = data.find((d) => d.year === v);
                return r?.is_partial ? `${v}*` : `${v}`;
              }}
            />
            <YAxis
              yAxisId="pct"
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              domain={[0, (max: number) => Math.ceil(max) + 4]}
            />
            {hasRoas && (
              <YAxis
                yAxisId="roas"
                orientation="right"
                tick={{ fill: "#00A3A8", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v.toFixed(0)}x`}
                domain={[0, (max: number) => Math.ceil(max / 10) * 10 + 20]}
              />
            )}
            <Tooltip content={<YearTooltip />} cursor={{ fill: "#f9fafb" }} />
            <Bar
              yAxisId="pct"
              dataKey="attrib_pct"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            >
              {data.map((r) => (
                <Cell
                  key={r.year}
                  fill={r.is_partial ? "#93C05D" : "#65A518"}
                  opacity={r.is_partial ? 0.7 : 1}
                />
              ))}
            </Bar>
            {hasRoas && (
              <Line
                yAxisId="roas"
                dataKey="roas"
                stroke="#00A3A8"
                strokeWidth={2}
                dot={{ fill: "#00A3A8", r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Right Y axis title */}
        {hasRoas && (
          <span
            className="text-[10px] shrink-0 select-none"
            style={{ writingMode: "vertical-lr", textAlign: "center", color: "#00A3A8" }}
          >
            ROAS
          </span>
        )}
      </div>

      {/* Leyenda */}
      <div className="flex items-center justify-center gap-6 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-[#65A518]" />
          Atribución de marketing
        </span>
        {hasRoas && (
          <span className="flex items-center gap-2">
            <span className="inline-flex items-center gap-0.5">
              <span className="inline-block w-4 h-0.5 bg-[#00A3A8]" />
              <span className="inline-block w-2 h-2 rounded-full bg-[#00A3A8]" />
              <span className="inline-block w-4 h-0.5 bg-[#00A3A8]" />
            </span>
            ROAS
          </span>
        )}
      </div>
    </div>
  );
}
