"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
  Cell,
} from "recharts";
import type { MonthlyScenario } from "@/lib/types";
import { fmtNum } from "@/lib/utils";

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

// Waterfall palette
const COLORS = {
  base:      "#003960",
  agentes:   "#4C7490",
  marketing: "#65A518",
};

// Sentinel value for the visual separator between real and forecast months
const SEPARATOR = "__sep__";

// ─── % label inside the Marketing bar ───────────────────────────────────────

function MktLabel({
  x, y, width, height, value,
}: {
  x?: number; y?: number; width?: number; height?: number; value?: number | null;
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
      {`${(value as number).toFixed(1)}%`}
    </text>
  );
}

// ─── custom tooltip ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MonthlyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (row?.isSeparator) return null;
  const isForecast: boolean = row?.isForecast ?? false;
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
        {label}
        {isForecast && (
          <span className="ml-1.5 text-[10px] text-gray-400 font-normal">
            Forecast
          </span>
        )}
      </p>
      {payload.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) =>
          p.value != null && (
            <p key={p.dataKey} style={{ color: p.fill ?? p.stroke }}>
              {p.name}:{" "}
              <span className="font-medium text-gray-900">
                {fmtNum(p.value as number)}
              </span>
            </p>
          )
      )}
    </div>
  );
}

// ─── data builder ────────────────────────────────────────────────────────────

interface DataRow {
  mes: string;
  Baseline:       number | null;
  Agentes:        number | null;
  Marketing:      number | null;
  Observado:      number | null;
  totalForecast:  number | null;
  mktPct:         number | null;
  isForecast:     boolean;
  isSeparator?:   boolean;
}

function buildData(monthly: MonthlyScenario[], years: number[]): DataRow[] {
  const multiYear = years.length > 1;

  const rows: DataRow[] = monthly
    .filter((m) => years.includes(m.year) && (m.obs != null || m.mkt_plan != null))
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .map((m): DataRow => {
      const isForecast  = m.obs == null;
      const mktValue    = isForecast ? m.mkt_plan : m.mkt_act;
      // Baseline = base + estac combined so both real and forecast bars reflect seasonality.
      // For real months: base (structural) + estac (seasonal). For forecast: base already
      // stores avg(base+estac) and estac is null, so the sum is the same.
      const baselineValue =
        m.base != null ? m.base + (m.estac ?? 0) : null;

      // rawTotal DEBE incluir estac (vía baselineValue) -- antes se omitía y el %
      // no coincidía con el del resumen ejecutivo ni con el anual (2026-08-24).
      const rawTotal = (baselineValue ?? 0) + (m.agentes ?? 0) + (mktValue ?? 0);
      // 1 decimal: e.g. 12.3
      const mktPct =
        rawTotal > 0 && mktValue != null
          ? Math.round((mktValue / rawTotal) * 1000) / 10
          : null;

      const total =
        baselineValue != null
          ? baselineValue + (m.agentes ?? 0) + (mktValue ?? 0)
          : null;

      return {
        mes: multiYear
          ? `${MONTH_LABELS[m.month - 1]} '${String(m.year).slice(2)}`
          : MONTH_LABELS[m.month - 1],
        Baseline:      baselineValue,
        Agentes:       m.agentes ?? null,
        Marketing:     mktValue  ?? null,
        Observado:     m.obs     ?? null,
        totalForecast: isForecast ? total : null,
        mktPct,
        isForecast,
      };
    });

  // Insert a thin separator column between last real and first forecast month.
  // The ReferenceLine placed at SEPARATOR draws in the space BETWEEN bars,
  // not on top of an existing bar.
  const firstForecastIdx = rows.findIndex((r) => r.isForecast);
  if (firstForecastIdx > 0) {
    rows.splice(firstForecastIdx, 0, {
      mes:           SEPARATOR,
      Baseline:      null,
      Agentes:       null,
      Marketing:     null,
      Observado:     null,
      totalForecast: null,
      mktPct:        null,
      isForecast: false,
      isSeparator: true,
    });
  }

  return rows;
}

// ─── component ───────────────────────────────────────────────────────────────

interface Props {
  monthly: MonthlyScenario[];
  selectedYears: number[];
  selectedMonths: number[];
}

export function AttributionMonthly({ monthly, selectedYears, selectedMonths }: Props) {
  // El filtro de mes lo controla el shell (Sección 1 también reacciona a él,
  // ver AttributionShell.tsx) -- aquí solo se usa para filtrar la data del chart.
  const filteredMonthly =
    selectedMonths.length > 0
      ? monthly.filter((m) => selectedMonths.includes(m.month))
      : monthly;

  const data = buildData(filteredMonthly, selectedYears);

  const hasAgentes    = data.some((d) => d.Agentes   != null && d.Agentes   !== 0);
  const forecastRows  = data.filter((d) => d.isForecast);
  const hasForecast   = forecastRows.length > 0;
  const lastForecastMes = hasForecast ? forecastRows[forecastRows.length - 1].mes : null;

  return (
    <div className="space-y-3">
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">
          Sin datos para el periodo seleccionado.
        </div>
      ) : (
      <div className="flex items-stretch gap-1">
      {/* Y axis title */}
      <span
        className="text-[10px] text-gray-400 shrink-0 select-none"
        style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", textAlign: "center" }}
      >
        Cotizaciones
      </span>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />

          {/* Forecast background zone — starts at separator, ends at last forecast month */}
          {hasForecast && lastForecastMes && (
            <ReferenceArea
              x1={SEPARATOR}
              x2={lastForecastMes}
              fill="#f3f4f6"
              fillOpacity={0.9}
              strokeOpacity={0}
              label={{
                value: "Forecast",
                position: "insideTopLeft",
                fontSize: 10,
                fill: "#9ca3af",
                dy: 4,
                dx: 4,
              }}
            />
          )}

          {/* Dashed divider at the separator column — visually appears between real and forecast bars */}
          {hasForecast && (
            <ReferenceLine
              x={SEPARATOR}
              stroke="#d1d5db"
              strokeDasharray="4 2"
              strokeWidth={1}
            />
          )}

          <XAxis
            dataKey="mes"
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={selectedYears.length > 1 ? 2 : 0}
            tickFormatter={(v) => (v === SEPARATOR ? "" : v)}
          />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => fmtNum(v)}
          />
          <Tooltip content={<MonthlyTooltip />} cursor={{ fill: "transparent" }} />
          <Legend wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 12 }} />

          <Bar
            dataKey="Baseline"
            stackId="cotiz"
            fill={COLORS.base}
            isAnimationActive={false}
            radius={[0, 0, 4, 4]}
          >
            {data.map((d, i) => (
              <Cell
                key={`base-${i}`}
                fill={d.isSeparator ? "transparent" : COLORS.base}
                opacity={d.isForecast ? 0.35 : 1}
              />
            ))}
          </Bar>

          {hasAgentes && (
            <Bar
              dataKey="Agentes"
              stackId="cotiz"
              fill={COLORS.agentes}
              isAnimationActive={false}
            >
              {data.map((d, i) => (
                <Cell
                  key={`ag-${i}`}
                  fill={d.isSeparator ? "transparent" : COLORS.agentes}
                  opacity={d.isForecast ? 0.35 : 1}
                />
              ))}
            </Bar>
          )}

          <Bar
            dataKey="Marketing"
            stackId="cotiz"
            fill={COLORS.marketing}
            isAnimationActive={false}
            radius={[4, 4, 0, 0]}
          >
            {data.map((d, i) => (
              <Cell
                key={`mkt-${i}`}
                fill={d.isSeparator ? "transparent" : COLORS.marketing}
                opacity={d.isForecast ? 0.35 : 1}
              />
            ))}
            <LabelList dataKey="mktPct" content={<MktLabel />} />
            <LabelList
              dataKey="totalForecast"
              position="top"
              offset={14}
              formatter={(v: unknown) =>
                v != null ? `${Math.round((v as number) / 1000)}k` : ""
              }
              style={{ fontSize: 9, fill: "#9ca3af" }}
            />
          </Bar>

          <Line
            dataKey="Observado"
            name="Observado"
            stroke="#d1d5db"
            strokeWidth={1.5}
            dot={{ r: 3, fill: "#d1d5db", strokeWidth: 0 }}
            activeDot={{ r: 4, fill: "#9ca3af", strokeWidth: 0 }}
            connectNulls={false}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="Observado"
              position="top"
              offset={14}
              formatter={(v: unknown) =>
                v != null ? `${Math.round((v as number) / 1000)}k` : ""
              }
              style={{ fontSize: 9, fill: "#9ca3af" }}
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
      </div>
      )}
    </div>
  );
}
