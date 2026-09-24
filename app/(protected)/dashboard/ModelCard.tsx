"use client";

import { fmtPct, fmtNum, fmtRoas, CHART_COLORS, aggregateMonthlyAttribution, monthlyModeledInvestment } from "@/lib/utils";
import type {
  ModelRun,
  AttributionBlock,
  Channel,
  RoiByYear,
  HeatmapData,
  ChannelMonthly,
  MonthlyScenario,
} from "@/lib/types";

const MONTH_ABBR = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

// ─── channel helpers ────────────────────────────────────────────────────────

const CANAL_NAMES: Record<string, string> = {
  "YouTube Branding": "YouTube",
  "Display (Prog+CTV)": "Display / Programatico",
  "Search/SEM": "SEM / Search",
};
function canalName(canal: string) {
  return CANAL_NAMES[canal] ?? canal;
}
function channelColor(canal: string): string {
  const c = canal.toLowerCase();
  if (c.includes("youtube")) return CHART_COLORS.youtube;
  if (c.includes("cartelera")) return CHART_COLORS.cartelera;
  if (c.includes("camion")) return CHART_COLORS.camion;
  if (c.includes("ooh")) return CHART_COLORS.ooh;
  if (
    c.includes("display") ||
    c.includes("prog") ||
    c.includes("programmatic") ||
    c.includes("ctv")
  )
    return CHART_COLORS.display;
  if (c.includes("pr") || c.includes("relaciones") || c.includes("alcance"))
    return CHART_COLORS.pr;
  if (c.includes("meta") || c.includes("facebook")) return CHART_COLORS.meta;
  if (c.includes("sem") || c.includes("search")) return CHART_COLORS.sem;
  if (c.includes("radio")) return CHART_COLORS.radio;
  return CHART_COLORS.marketing;
}

// ─── aggregation ────────────────────────────────────────────────────────────

function aggregate(rows: RoiByYear[]) {
  if (rows.length === 0) return { attrib: null, mktCot: null, roas: null };

  const totalMktCot = rows.every((r) => r.mkt_cot == null)
    ? null
    : rows.reduce((s, r) => s + (r.mkt_cot ?? 0), 0);

  const totalCotObs = rows.reduce((s, r) => s + (r.cot_obs ?? 0), 0);

  const attrib =
    totalMktCot != null && totalCotObs > 0
      ? (totalMktCot / totalCotObs) * 100
      : null;

  let roasNum = 0,
    roasDen = 0;
  for (const r of rows) {
    if (r.roas != null && r.inv != null && r.inv > 0) {
      roasNum += r.roas * r.inv;
      roasDen += r.inv;
    }
  }
  const roas = roasDen > 0 ? roasNum / roasDen : null;

  return { attrib, mktCot: totalMktCot, roas };
}

// Top-3 canales desde channel_monthly (etapa 2b) -- solo canales MODELADOS,
// share = % del total de contribucion modelada del mes (mismo criterio que
// share_contrib en ChannelShell.tsx / deriveMonthlyChannelMetrics).
function monthlyTopChannels(channelMonthly: ChannelMonthly[], year: number, months: number[]) {
  const rows = channelMonthly.filter((r) => r.year === year && months.includes(r.month));
  const cotByCanal: Record<string, number> = {};
  for (const r of rows) {
    if (r.contrib_cot == null) continue;
    cotByCanal[r.canal] = (cotByCanal[r.canal] ?? 0) + r.contrib_cot;
  }
  const total = Object.values(cotByCanal).reduce((s, v) => s + v, 0);
  if (total <= 0) return [];
  return Object.entries(cotByCanal)
    .map(([canal, cot]) => ({ canal, share_contrib: (cot / total) * 100 }))
    .sort((a, b) => b.share_contrib - a.share_contrib)
    .slice(0, 3)
    .map((c) => ({ key: `${c.canal}-month`, ...c }));
}

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  // iso es un `date` de Postgres (sin hora, p.ej. run.data_through) -- sin
  // timeZone:"UTC" explícito, toLocaleDateString usa la zona local del
  // proceso y en cualquier huso detrás de UTC (México, UTC-6) el día se
  // corre un día hacia atrás (2026-08-31 se mostraba como "30 de agosto").
  // Bug real reportado por el usuario 2026-09-24 ("información al 26 de
  // julio" cuando data_through era 2026-07-27).
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ─── component ──────────────────────────────────────────────────────────────

export function ModelCard({
  title,
  run,
  blocks,
  channels,
  roi,
  heatmap,
  monthly = [],
  channelMonthly = [],
  selectedYears,
  chipYear,
  selectedMonths = [],
}: {
  title: string;
  run: ModelRun | null;
  blocks: AttributionBlock[];
  channels: Channel[];
  roi: RoiByYear[];
  heatmap: HeatmapData[];
  monthly?: MonthlyScenario[];
  channelMonthly?: ChannelMonthly[];
  selectedYears: number[];
  chipYear: number | null;
  selectedMonths?: number[];
}) {
  const selectedRows = roi.filter((r) => selectedYears.includes(r.year));
  const allRoiYears = roi.map((r) => r.year);
  const isAllYears =
    allRoiYears.length > 0 &&
    allRoiYears.every((y) => selectedYears.includes(y));

  const { attrib: rawAttrib, mktCot, roas: rawRoas } = aggregate(selectedRows);

  // When all available years are selected, defer to the model-level attrib_mkt
  // stored in model_runs. Per-year values come from different source aggregations
  // and don't reproduce the model-period total correctly when summed.
  const rawAttribResolved =
    isAllYears && run?.attrib_mkt != null ? run.attrib_mkt : rawAttrib;

  // ── Filtro de mes (etapa 2b) -- solo con 1 año activo (selectedMonths ya
  // viene en [] desde DashboardShell cuando no aplica). ROAS se deja en "—":
  // ROAS mensual = cotizaciones atribuidas * cierre * prima / inversión de
  // canales MODELADOS ese mes (channel_monthly no cubre no-modelados, ver
  // migración 002_channel_monthly.sql) -- alcance un poco más chico que el
  // ROAS anual (que sí incluye inversión de referencia no-modelada), puede
  // salir algo más alto por eso. Se prefiere mostrar un número real (aunque
  // con ese matiz de alcance) a dejarlo vacío.
  const monthActive = selectedMonths.length > 0 && selectedYears.length === 1;
  const monthRows = monthActive
    ? monthly.filter((m) => m.year === selectedYears[0] && selectedMonths.includes(m.month))
    : [];
  const monthKpis = monthActive
    ? aggregateMonthlyAttribution(monthRows, roi.find((r) => r.year === selectedYears[0]))
    : null;

  const attrib = monthKpis ? monthKpis.attribPct : rawAttribResolved;
  const roiYearForMonth = roi.find((r) => r.year === selectedYears[0]);
  const monthInv = monthActive
    ? monthlyModeledInvestment(channelMonthly, selectedYears[0], selectedMonths)
    : 0;
  const monthPrima = monthKpis?.prima ?? null;
  const monthRoas =
    monthActive && monthInv > 0 && monthPrima != null ? monthPrima / monthInv : null;
  const roas = monthActive ? monthRoas : rawRoas;
  const basePct = attrib != null ? 100 - attrib : null;

  // chipYear = the year the user last clicked; drives channel chips.
  // Falls back to the most recent selected year if not provided.
  const displayYear =
    chipYear ?? [...selectedYears].sort((a, b) => b - a)[0];
  const yearHeatmap = heatmap
    .filter((h) => h.year === displayYear)
    .sort((a, b) => (b.contrib_pct ?? 0) - (a.contrib_pct ?? 0));

  type TopChannel = { key: string; canal: string; share_contrib: number | null };
  const monthTopChannels = monthActive
    ? monthlyTopChannels(channelMonthly, selectedYears[0], selectedMonths)
    : [];
  const topChannels: TopChannel[] =
    monthTopChannels.length > 0
      ? monthTopChannels
      : yearHeatmap.length > 0
      ? yearHeatmap.slice(0, 3).map((h) => ({
          key: `${h.canal}-${h.year}`,
          canal: h.canal,
          share_contrib: h.contrib_pct,
        }))
      : channels
          .filter((c) => c.is_modeled && (c.share_contrib ?? 0) > 0)
          .sort((a, b) => (b.share_contrib ?? 0) - (a.share_contrib ?? 0))
          .slice(0, 3)
          .map((c) => ({
            key: c.id,
            canal: c.canal,
            share_contrib: c.share_contrib,
          }));

  const chipsPeriodLabel = monthActive
    ? `${MONTH_ABBR[selectedMonths[selectedMonths.length - 1] - 1]} ${selectedYears[0]}`
    : displayYear;

  const hasDataForYear = selectedRows.length > 0;

  if (!run) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <p className="text-gray-700 font-semibold">{title}</p>
        <p className="text-gray-400 text-xs mt-2">Sin datos publicados.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <p className="text-gray-900 font-semibold">{title}</p>
        <p className="text-gray-400 text-xs mt-0.5">
          Informacion al {formatDate(run.data_through)}
        </p>
        {!hasDataForYear && (
          <p className="text-[10px] text-gray-400 mt-1.5">
            Sin datos para el periodo seleccionado
          </p>
        )}
      </div>

      {/* Business KPIs */}
      <div className="grid grid-cols-3 gap-px bg-gray-100 border-t border-b border-gray-100">
        {/* Attribution % — hero */}
        <div className="bg-white px-4 py-4 col-span-1">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
            Atribucion de Marketing
          </p>
          <p className="text-3xl font-bold text-[#006729] leading-none">
            {attrib != null ? fmtPct(attrib, 1) : "—"}
          </p>
          <p className="text-xs text-gray-400 mt-1.5">del total de cotizaciones</p>
        </div>

        {/* Cotizaciones + ROAS stacked */}
        <div className="col-span-2 grid grid-rows-2 gap-px">
          <div className="bg-white px-4 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                Cotizaciones atribuidas
              </p>
              <p className="text-xl font-bold text-gray-900">
                {(monthKpis ? monthKpis.mktSum : mktCot) != null
                  ? fmtNum(monthKpis ? monthKpis.mktSum : mktCot!)
                  : "—"}
              </p>
            </div>
            {(monthActive || selectedYears.length === 1) && (
              <span className="text-xs text-gray-300 font-medium">
                {monthActive
                  ? `${MONTH_ABBR[selectedMonths[selectedMonths.length - 1] - 1]} ${selectedYears[0]}`
                  : selectedYears[0]}
              </span>
            )}
          </div>
          <div className="bg-white px-4 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                ROAS
              </p>
              <p className="text-xl font-bold text-gray-900">
                {roas != null ? fmtRoas(roas) : "—"}
              </p>
            </div>
            <span className="text-xs text-gray-400">
              {monthActive ? "canales modelados" : "por peso invertido"}
            </span>
          </div>
        </div>
      </div>

      {/* Attribution bar */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          {basePct != null ? (
            <span>Baseline {fmtPct(basePct, 1)}</span>
          ) : (
            <span className="text-gray-300">Baseline —</span>
          )}
          <span className="text-[#65A518] font-medium">
            Marketing {attrib != null ? fmtPct(attrib, 1) : "—"}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex">
          {basePct != null && (
            <>
              <div
                className="h-full bg-gray-200 transition-all duration-300"
                style={{ width: `${basePct}%` }}
              />
              <div
                className="h-full bg-[#65A518] transition-all duration-300"
                style={{ width: `${attrib ?? 0}%` }}
              />
            </>
          )}
        </div>
      </div>

      {/* Top channels */}
      {topChannels.length > 0 && (
        <div className="px-5 pb-4">
          <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">
            Principales canales
            {(monthActive || yearHeatmap.length > 0) && (
              <span className="ml-1 normal-case font-normal text-gray-300">
                {chipsPeriodLabel}
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {topChannels.map((ch) => (
              <span
                key={ch.key}
                className="inline-flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-100 rounded-full px-2.5 py-1 text-gray-700"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: channelColor(ch.canal) }}
                />
                <span className="font-medium">{canalName(ch.canal)}</span>
                <span className="text-gray-400">
                  {ch.share_contrib != null ? fmtPct(ch.share_contrib, 0) : "—"}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer: model fit */}
      <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-4 bg-gray-50/60">
        {run.r2_adj != null && (
          <span className="text-xs text-gray-500">
            R² ajustado{" "}
            <span className="text-gray-700 font-medium">
              {run.r2_adj.toFixed(3)}
            </span>
          </span>
        )}
        {run.mape != null && (
          <span className="text-xs text-gray-500">
            Error promedio{" "}
            <span className="text-gray-700 font-medium">
              {fmtPct(run.mape, 1)}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
