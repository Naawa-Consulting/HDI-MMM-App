"use client";

import { useState, useMemo, useRef } from "react";
import { ChannelBarChart } from "@/components/charts/ChannelBarChart";
import { MonthSelector } from "@/components/MonthSelector";
import { fmtPct, fmtMXN, fmtRoas, fmtNum } from "@/lib/utils";
import type { Channel, RoiByYear, HeatmapData, ChannelMonthly, MonthlyScenario } from "@/lib/types";

// ─── PDF export ───────────────────────────────────────────────────────────────

async function exportPDF(el: HTMLElement, filename: string) {
  const { toPng } = await import("html-to-image");
  const { jsPDF } = await import("jspdf");

  const dataUrl = await toPng(el, {
    pixelRatio: 2,
    backgroundColor: "#f9fafb",
    filter: (node) => !(node as HTMLElement).hasAttribute?.("data-html2canvas-ignore"),
  });

  const img = new Image();
  await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = dataUrl; });

  const pdf   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW  = pageW;
  const imgH  = (img.naturalHeight * imgW) / img.naturalWidth;

  let remaining = imgH;
  let yOffset   = 0;
  pdf.addImage(dataUrl, "PNG", 0, yOffset, imgW, imgH);
  remaining -= pageH;
  while (remaining > 0) {
    yOffset -= pageH;
    pdf.addPage();
    pdf.addImage(dataUrl, "PNG", 0, yOffset, imgW, imgH);
    remaining -= pageH;
  }
  pdf.save(filename);
}

// ─── Excel export ─────────────────────────────────────────────────────────────

async function exportExcel(
  scope: string,
  modeled: Channel[],
  nonModeled: Channel[],
  heatmap: HeatmapData[] | undefined,
  activeYears: number[],
  allSelected: boolean,
  activeMonths: number[] = [],
) {
  const { utils, writeFile } = await import("xlsx");
  const wb    = utils.book_new();
  const label  = scope === "nacional" ? "Nacional" : "CDMX";
  const MONTH_ABBR = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const period = allSelected
    ? "Periodo completo"
    : activeYears.join(", ") + (activeMonths.length > 0
        ? ` (${activeMonths.map((m) => MONTH_ABBR[m - 1]).join(", ")})`
        : "");

  // ── Hoja 1: Canales modelados ─────────────────────────────────────────────
  const chRows = [
    ["Modelo", label],
    ["Periodo", period],
    [],
    [
      "Canal", "Inversion (MXN)", "Share de Inversion (%)", "Share de Contribucion (%)",
      "Contribucion Total (%)", "Cotizaciones atribuidas", "ROAS (x)", "CPA (MXN/cotiz)", "Saturacion (%)",
    ],
    ...modeled.map((c) => [
      c.canal,
      c.inv,
      c.share_inv != null ? c.share_inv / 100 : null,
      c.share_contrib != null ? c.share_contrib / 100 : null,
      c.contrib_pct != null ? c.contrib_pct / 100 : null,
      c.contrib_cot != null ? Math.round(c.contrib_cot) : null,
      c.roas,
      c.cpa_cot,
      c.sat_op != null ? c.sat_op / 100 : null,
    ]),
  ];
  const wsCh = utils.aoa_to_sheet(chRows);
  utils.book_append_sheet(wb, wsCh, "Canales Modelados");

  // ── Hoja 2: Heatmap canal × año ───────────────────────────────────────────
  if (heatmap && heatmap.length > 0) {
    const heatRows = [
      ["Canal", "Año", "Share de Contribucion (%)", "ROAS (x)", "Inversion (MXN)"],
      ...heatmap
        .sort((a, b) => a.canal.localeCompare(b.canal) || a.year - b.year)
        .map((h) => [
          h.canal,
          h.year,
          h.contrib_pct != null ? h.contrib_pct / 100 : null,
          h.roim,
          h.inv,
        ]),
    ];
    const wsHeat = utils.aoa_to_sheet(heatRows);
    utils.book_append_sheet(wb, wsHeat, "Heatmap Canal x Anio");
  }

  // ── Hoja 3: Canales no modelados ─────────────────────────────────────────
  if (nonModeled.length > 0) {
    const nmRows = [
      ["Canal", "Inversion (MXN)"],
      ...nonModeled.map((c) => [c.canal, c.inv]),
    ];
    const wsNm = utils.aoa_to_sheet(nmRows);
    utils.book_append_sheet(wb, wsNm, "Canales No Modelados");
  }

  const monthSuffix = activeMonths.length > 0 ? `_m${activeMonths.join("-")}` : "";
  writeFile(wb, `canales_${scope}_${activeYears.join("-")}${monthSuffix}.xlsx`);
}

// ─── Derive year-filtered channel metrics from heatmap × roi ──────────────────
//
// channels table has no year column — full-period aggregates only.
// When the user picks specific years we recompute inv, contrib_pct,
// share_inv, share_contrib and roas from heatmap_data (per canal × year)
// combined with roi_by_year (for cot_obs and econ params).

function deriveChannelMetrics(
  channels: Channel[],
  heatmap: HeatmapData[],
  roi: RoiByYear[],
  activeYears: number[],
  allSelected: boolean,
): Channel[] {
  // BUG CORREGIDO 2026-09-24: "Todos" (allSelected) devolvía `channels` tal
  // cual -- esa tabla NO es un agregado histórico, es una foto de un solo
  // año (2025, ver push_nacional.py: "Channels (only upsert once — use 2025
  // block as source)"). El usuario lo notó con OOH: seleccionar "Todos"
  // seguía mostrando 0%, porque en realidad seguía mostrando el snapshot de
  // 2025 (donde OOH es correctamente n/d), no una agregación de 2022-2026
  // (donde OOH sí tuvo contribución real). `activeYears` ya es `allYears`
  // cuando allSelected=true (ver el caller), así que basta con dejar que
  // pase por la misma agregación que cualquier selección de varios años.
  if (!heatmap.length) return channels;

  const roiMap = new Map(roi.map((r) => [r.year, r]));
  const activeRoi = roi.filter((r) => activeYears.includes(r.year));

  // Weighted-average econ params over selected years (weights = cot_obs)
  const totalObs = activeRoi.reduce((s, r) => s + (r.cot_obs ?? 0), 0);
  const avgClose =
    totalObs > 0
      ? activeRoi.reduce((s, r) => s + (r.close_rate ?? 0) * (r.cot_obs ?? 0), 0) / totalObs
      : 0;
  const avgPrima =
    totalObs > 0
      ? activeRoi.reduce((s, r) => s + (r.prima_avg ?? 0) * (r.cot_obs ?? 0), 0) / totalObs
      : 0;

  // Aggregate heatmap for selected years, per canal.
  // BUG CORREGIDO 2026-09-24: un canal con contrib_pct=null en un año dado
  // (p.ej. OOH 2025-26, inversion de marca no modelada -- ver
  // project_ooh_auto_vs_marca) se trataba como 0 (`h.contrib_pct ?? 0`) y se
  // diluía contra el `obs` de ESE año igual que un año con contribucion real
  // -- terminaba pareciendo "0% en todo el histórico" aunque el canal sí
  // contribuyó de verdad en otros años de la misma selección. Ahora
  // `obsKnown`/`cotKnown` solo acumulan años donde el canal tiene dato real;
  // `contrib_pct` sale null solo si NINGÚN año seleccionado tiene dato real
  // para ese canal.
  type Acc = { cot: number; obsKnown: number; inv: number; satSum: number; satN: number };
  const agg: Record<string, Acc> = {};

  for (const h of heatmap) {
    if (!activeYears.includes(h.year)) continue;
    const r   = roiMap.get(h.year);
    const obs = r?.cot_obs ?? 0;
    if (!agg[h.canal]) agg[h.canal] = { cot: 0, obsKnown: 0, inv: 0, satSum: 0, satN: 0 };
    if (h.contrib_pct != null) {
      agg[h.canal].cot += (h.contrib_pct / 100) * obs;
      agg[h.canal].obsKnown += obs;
    }
    agg[h.canal].inv += h.inv ?? 0;
    // Accumulate sat_op weighted by active weeks (proxy: cot > 0)
    if (h.sat_op != null && h.sat_op > 0) {
      agg[h.canal].satSum += h.sat_op;
      agg[h.canal].satN   += 1;
    }
  }

  const totalInv        = Object.values(agg).reduce((s, v) => s + v.inv, 0);
  const totalModeledCot = channels
    .filter((c) => c.is_modeled)
    .reduce((s, c) => s + (agg[c.canal]?.cot ?? 0), 0);

  return channels.map((c) => {
    const a = agg[c.canal];
    if (!a) return c;

    const hasData     = a.obsKnown > 0;   // false = ningún año activo tiene dato real para este canal (n/d)
    const cot         = a.cot;
    const inv         = a.inv;
    const contrib_pct = hasData ? cot / a.obsKnown * 100 : null;
    const share_inv   = totalInv > 0 && inv > 0 ? inv / totalInv * 100 : null;
    // Antes: un canal sin dato real (hasData=false, cot=0 por no acumularse)
    // caía en la misma rama que un canal modelado con contribución real de
    // cero, mostrando "0%" en vez de "—" (n/d) -- ver fix de `contrib_pct`
    // arriba, mismo criterio aplicado aquí.
    const share_contrib =
      !c.is_modeled ? null : !hasData ? null : totalModeledCot > 0 ? cot / totalModeledCot * 100 : 0;
    const roas =
      inv > 0 && cot > 0 && avgClose > 0 && avgPrima > 0
        ? (cot * avgClose * avgPrima) / inv
        : null;
    // Use average sat_op across selected years if per-year data available,
    // otherwise fall back to the full-period value from channels table.
    const sat_op = a.satN > 0 ? Math.round(a.satSum / a.satN * 10) / 10 : c.sat_op;

    return {
      ...c,
      contrib_cot:   hasData ? cot : null,
      contrib_pct,
      inv:           inv > 0 ? inv : null,
      share_inv,
      share_contrib,
      roas,
      sat_op,
    };
  });
}

// ─── Derive month-filtered channel metrics from channel_monthly (etapa 2) ─────
//
// Solo aplica sobre el resultado de deriveChannelMetrics para UN año activo
// (ver monthFilterEnabled en el shell). channel_monthly solo cubre canales
// MODELADOS -- un canal sin fila ahi (no-modelado) se deja tal cual venia
// (su dato anual de ese año, ya resuelto por deriveChannelMetrics).

function deriveMonthlyChannelMetrics(
  channelsAnnual: Channel[],
  channelMonthly: ChannelMonthly[],
  monthly: MonthlyScenario[],
  roi: RoiByYear[],
  year: number,
  months: number[],
): Channel[] {
  const rows = channelMonthly.filter(
    (r) => r.year === year && months.includes(r.month)
  );
  if (!rows.length) return channelsAnnual;

  const roiYear = roi.find((r) => r.year === year);
  const close = roiYear?.close_rate ?? null;   // escala 0-100, igual que en deriveChannelMetrics
  const prima = roiYear?.prima_avg ?? null;

  const totalObs = monthly
    .filter((m) => m.year === year && months.includes(m.month))
    .reduce((s, m) => s + (m.obs ?? 0), 0);

  type Acc = { cot: number; inv: number; hasContrib: boolean; hasInv: boolean };
  const agg: Record<string, Acc> = {};
  for (const r of rows) {
    if (!agg[r.canal]) agg[r.canal] = { cot: 0, inv: 0, hasContrib: false, hasInv: false };
    if (r.contrib_cot != null) { agg[r.canal].cot += r.contrib_cot; agg[r.canal].hasContrib = true; }
    if (r.inv != null)         { agg[r.canal].inv += r.inv;         agg[r.canal].hasInv = true; }
  }

  const totalModeledCot = channelsAnnual
    .filter((c) => c.is_modeled)
    .reduce((s, c) => s + (agg[c.canal]?.hasContrib ? agg[c.canal].cot : 0), 0);
  // share_inv aqui solo compara entre canales MODELADOS (channel_monthly no
  // cubre no-modelados) -- a diferencia del share_inv anual, que sí los incluye.
  const totalInv = Object.values(agg).reduce((s, a) => s + (a.hasInv ? a.inv : 0), 0);

  return channelsAnnual.map((c) => {
    const a = agg[c.canal];
    if (!a) return c;

    const cot = a.hasContrib ? a.cot : null;
    const inv = a.hasInv ? a.inv : null;
    const contrib_pct   = cot != null && totalObs > 0 ? (cot / totalObs) * 100 : null;
    const share_contrib = cot == null ? null : totalModeledCot > 0 ? (cot / totalModeledCot) * 100 : 0;
    const share_inv     = inv != null && inv > 0 && totalInv > 0 ? (inv / totalInv) * 100 : null;
    const roas =
      inv != null && inv > 0 && cot != null && cot > 0 && close != null && prima != null
        ? (cot * (close / 100) * prima) / inv
        : null;

    return { ...c, contrib_cot: cot, contrib_pct, inv, share_inv, share_contrib, roas };
  });
}

// ─── Heatmap (inline — only used when heatmap prop is present) ────────────────

// HDI green scale: white → #006729 (dark green)
// Returns [bgColor, isDark] so text can flip to white on dark cells
function heatColor(pct: number | null, maxPct: number): [string, boolean] {
  if (pct == null || pct === 0) return ["#f3f4f6", false];
  const t = Math.min(1, Math.max(0, pct / maxPct));
  // white (255,255,255) → HDI dark green (0,103,41)
  const r = Math.round(255 * (1 - t) + 0   * t);
  const g = Math.round(255 * (1 - t) + 103 * t);
  const b = Math.round(255 * (1 - t) + 41  * t);
  // perceived luminance — flip text to white above ~40% saturation
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return [`rgb(${r},${g},${b})`, lum < 140];
}

function HeatmapGrid({ data }: { data: HeatmapData[] }) {
  const canals = [...new Set(data.map((d) => d.canal))];
  const years  = [...new Set(data.map((d) => d.year))].sort();
  const lookup = new Map<string, HeatmapData>();
  data.forEach((d) => lookup.set(`${d.canal}__${d.year}`, d));

  // Dynamic max: 95th-percentile of non-zero values so outliers don't wash out the scale
  const allPcts = data.map((d) => d.contrib_pct ?? 0).filter((v) => v > 0).sort((a, b) => a - b);
  const p95idx  = Math.floor(allPcts.length * 0.95);
  const maxPct  = allPcts.length > 0 ? (allPcts[p95idx] ?? allPcts[allPcts.length - 1]) : 100;

  return (
    <div className="overflow-auto">
      <table className="text-xs border-collapse min-w-[400px]">
        <thead>
          <tr>
            <th className="text-left pr-4 pb-2 text-gray-500 font-medium">Canal</th>
            {years.map((y) => (
              <th key={y} className="text-center px-3 pb-2 text-gray-500 font-medium w-20">
                {y}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {canals.map((canal) => (
            <tr key={canal}>
              <td className="pr-4 py-1.5 text-gray-700 font-medium whitespace-nowrap">{canal}</td>
              {years.map((year) => {
                const cell = lookup.get(`${canal}__${year}`);
                const [bg, dark] = heatColor(cell?.contrib_pct ?? null, maxPct);
                const textMain = dark ? "text-white" : "text-gray-900";
                const textSub  = dark ? "text-white/70" : "text-gray-500";
                return (
                  <td key={year} className="px-1 py-1">
                    <div
                      className="rounded-lg px-2 py-1.5 text-center"
                      style={{ backgroundColor: bg }}
                    >
                      <p className={`font-semibold ${textMain}`}>
                        {cell?.roim != null && cell.roim > 0 ? fmtRoas(cell.roim) : "—"}
                      </p>
                      <p className={`text-[10px] ${textSub}`}>
                        {cell?.contrib_pct != null && cell.contrib_pct > 0
                          ? fmtPct(cell.contrib_pct, 1)
                          : "—"}
                      </p>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Year selector (same pattern as AttributionShell) ─────────────────────────

interface YearSelectorProps {
  allYears:     number[];
  selected:     number[];
  allSelected:  boolean;
  partialYears: Set<number>;
  onToggle:     (y: number) => void;
  onSelectAll:  () => void;
}

function YearSelector({
  allYears, selected, allSelected, partialYears, onToggle, onSelectAll,
}: YearSelectorProps) {
  const hasPartialSelected = (allSelected ? allYears : selected).some((y) =>
    partialYears.has(y)
  );

  return (
    <div className="flex items-center gap-2 flex-wrap mb-6">
      <span className="text-xs text-gray-500 font-medium">Periodo:</span>

      <button
        onClick={onSelectAll}
        className={[
          "text-xs px-3 py-1.5 rounded-full font-medium transition-colors",
          allSelected
            ? "bg-[#006729] text-white"
            : "bg-gray-100 text-gray-500 hover:bg-gray-200",
        ].join(" ")}
      >
        Todos
      </button>

      {allYears.map((y) => {
        const isActive  = !allSelected && selected.includes(y);
        const isPartial = partialYears.has(y);
        return (
          <button
            key={y}
            onClick={() => onToggle(y)}
            className={[
              "text-xs px-3 py-1.5 rounded-full font-medium transition-colors",
              isActive
                ? "bg-[#006729] text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200",
            ].join(" ")}
          >
            {y}
            {isPartial && (
              <span className={isActive ? " opacity-60" : " opacity-40"}>*</span>
            )}
          </button>
        );
      })}

      {allSelected && (
        <span className="text-[10px] text-gray-400 ml-2">Periodo completo del modelo</span>
      )}
      {!allSelected && hasPartialSelected && (
        <span className="text-[10px] text-amber-500 ml-2">* Año parcial</span>
      )}
    </div>
  );
}

// ─── Main shell ───────────────────────────────────────────────────────────────

interface Props {
  scope:          "nacional" | "cdmx";
  channels:       Channel[];
  roi:            RoiByYear[];
  heatmap?:       HeatmapData[];
  channelMonthly?: ChannelMonthly[];
  monthly?:       MonthlyScenario[];
}

export function ChannelShell({ scope, channels, roi, heatmap, channelMonthly = [], monthly = [] }: Props) {
  // ── Year selector state ───────────────────────────────────────────────────
  const allYears = useMemo(() => {
    const s = new Set(roi.filter((r) => r.cot_obs != null).map((r) => r.year));
    return [...s].sort((a, b) => b - a);
  }, [roi]);

  const defaultYear = useMemo(() => {
    return roi
      .filter((r) => r.cot_obs != null)
      .sort((a, b) => b.year - a.year)[0]?.year ?? allYears[0];
  }, [roi, allYears]);

  const [selected, setSelected]     = useState<number[]>(defaultYear != null ? [defaultYear] : []);
  const [allSelected, setAllSelected] = useState(false);

  const partialYears = useMemo(
    () => new Set(roi.filter((r) => r.is_partial).map((r) => r.year)),
    [roi]
  );

  // Filtro de mes (etapa 2) -- solo con exactamente 1 año activo (no "Todos").
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  function toggle(y: number) {
    setSelectedMonths([]);
    if (allSelected) { setAllSelected(false); setSelected([y]); return; }
    setSelected((prev) =>
      prev.includes(y)
        ? prev.length > 1 ? prev.filter((p) => p !== y) : prev
        : [...prev, y].sort((a, b) => a - b)
    );
  }

  const activeYears = allSelected ? allYears : selected;
  const monthFilterEnabled = !allSelected && activeYears.length === 1;
  const activeMonths = monthFilterEnabled ? selectedMonths : [];

  const availableMonths = monthFilterEnabled
    ? [...new Set(
        channelMonthly.filter((r) => r.year === activeYears[0]).map((r) => r.month)
      )].sort((a, b) => a - b)
    : [];

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredHeatmap = heatmap?.filter((h) => activeYears.includes(h.year)) ?? [];

  // Channel metrics react to selected years via heatmap × roi derivation
  const activeChannelsAnnual = useMemo(
    () => deriveChannelMetrics(channels, heatmap ?? [], roi, activeYears, allSelected),
    [channels, heatmap, roi, activeYears, allSelected],
  );

  // Cuando hay mes(es) especifico(s) elegidos, se sobrepone la contribucion/
  // ROI real de channel_monthly (solo canales modelados; los no-modelados
  // se quedan con su dato anual, ver deriveMonthlyChannelMetrics).
  const activeChannels = useMemo(
    () =>
      monthFilterEnabled && activeMonths.length > 0
        ? deriveMonthlyChannelMetrics(
            activeChannelsAnnual, channelMonthly, monthly, roi, activeYears[0], activeMonths
          )
        : activeChannelsAnnual,
    [activeChannelsAnnual, channelMonthly, monthly, roi, activeYears, monthFilterEnabled, activeMonths],
  );

  const modeled    = activeChannels.filter((c) => c.is_modeled);
  const nonModeled = activeChannels.filter((c) => !c.is_modeled);

  const contentRef  = useRef<HTMLDivElement>(null);
  const scopeLabel  = scope === "nacional" ? "Nacional" : "CDMX";
  const activeHeatmap = filteredHeatmap.length > 0 ? filteredHeatmap : heatmap;

  return (
    <div ref={contentRef} className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-gray-900 text-2xl font-semibold">
            Canales y ROI — {scopeLabel}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Inversion, contribucion y retorno por canal
          </p>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2 print:hidden shrink-0" data-html2canvas-ignore>
          <button
            onClick={() => {
              if (contentRef.current) {
                exportPDF(contentRef.current, `canales_${scope}_${activeYears.join("-")}.pdf`);
              }
            }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            PDF
          </button>
          <button
            onClick={() =>
              exportExcel(scope, modeled, nonModeled, activeHeatmap, activeYears, allSelected, activeMonths)
            }
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel
          </button>
        </div>
      </div>

      {/* Year selector */}
      {allYears.length > 0 && (
        <YearSelector
          allYears={allYears}
          selected={selected}
          allSelected={allSelected}
          partialYears={partialYears}
          onToggle={toggle}
          onSelectAll={() => { setSelectedMonths([]); setAllSelected(true); setSelected(allYears); }}
        />
      )}

      {/* Month selector (etapa 2) -- solo con 1 año activo */}
      {monthFilterEnabled && availableMonths.length > 0 && (
        <div className="mb-6 -mt-3">
          <MonthSelector
            availableMonths={availableMonths}
            selected={activeMonths}
            onToggle={(m) =>
              setSelectedMonths((prev) =>
                prev.includes(m) ? prev.filter((p) => p !== m) : [...prev, m].sort((a, b) => a - b)
              )
            }
            onSelectAll={() => setSelectedMonths([])}
            enabled={monthFilterEnabled}
          />
        </div>
      )}

      {/* ── Channel cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {modeled.map((c) => {
          const gap      = (c.share_inv ?? 0) - (c.share_contrib ?? 0);
          const gapClass =
            Math.abs(gap) < 2
              ? "text-gray-500"
              : gap > 0
              ? "text-[#E60018]"
              : "text-[#65A518]";
          return (
            <div key={c.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <p className="text-gray-900 font-semibold text-sm leading-tight">{c.canal}</p>
                {c.sat_op != null && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.sat_op > 75
                        ? "bg-red-50 text-[#E60018]"
                        : c.sat_op > 50
                        ? "bg-yellow-50 text-yellow-700"
                        : "bg-green-50 text-[#006729]"
                    }`}
                  >
                    {fmtPct(c.sat_op, 0)} saturacion
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-400">Inversion</p>
                  <p className="text-gray-900 font-medium">{fmtMXN(c.inv)}</p>
                </div>
                <div>
                  <p className="text-gray-400">ROAS</p>
                  <p className="text-gray-900 font-medium">{fmtRoas(c.roas)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Share de Inversion</p>
                  <p className="text-gray-900 font-medium">{fmtPct(c.share_inv, 1)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Contribucion Total</p>
                  <p className="text-gray-900 font-medium">{c.contrib_pct != null ? fmtPct(c.contrib_pct, 1) : "—"}</p>
                </div>
              </div>

              {/* ── Share de Contribucion — bar ── */}
              {c.share_contrib != null && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                    <span>Share de Contribucion</span>
                    <span className={gapClass}>{fmtPct(c.share_contrib, 1)}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#65A518] rounded-full"
                      style={{ width: `${Math.min(100, c.share_contrib)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bar chart ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
        <h3 className="text-gray-900 font-semibold mb-1">
          Share de inversion vs contribucion
        </h3>
        <p className="text-gray-500 text-xs mb-4">
          Solo canales modelados — periodo completo del modelo
        </p>
        <ChannelBarChart channels={modeled} />
      </div>

      {/* ── Heatmap (CDMX only) — filtered by year ──────────────────────── */}
      {heatmap && heatmap.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
          <h3 className="text-gray-900 font-semibold mb-1">Heatmap canal × año</h3>
          <p className="text-gray-500 text-xs mb-4">
            Contribucion (%) por color · ROAS como valor · años seleccionados
          </p>
          <HeatmapGrid
            data={filteredHeatmap.length > 0 ? filteredHeatmap : heatmap}
          />
        </div>
      )}

      {/* ── Non-modeled channels ─────────────────────────────────────────── */}
      {nonModeled.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 mt-6">
          <h3 className="text-gray-700 font-semibold mb-3 text-sm">Canales no modelados</h3>
          <div className="flex flex-wrap gap-3">
            {nonModeled.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs"
              >
                <p className="text-gray-900 font-medium">{c.canal}</p>
                <p className="text-gray-500 mt-0.5">{fmtMXN(c.inv)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
