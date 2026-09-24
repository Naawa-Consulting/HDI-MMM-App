"use client";

import { useState, useMemo, useRef } from "react";
import { AttributionWaterfall } from "@/components/charts/AttributionWaterfall";
import { AttributionYearChart } from "@/components/charts/AttributionYearChart";
import { AttributionMonthly } from "@/components/charts/AttributionMonthly";
import { MonthSelector } from "@/components/MonthSelector";
import { fmtPct, fmtNum, fmtMXN, fmtMXNM, fmtRoas, aggregateMonthlyAttribution } from "@/lib/utils";
import type {
  ModelRun,
  AttributionBlock,
  RoiByYear,
  MonthlyScenario,
} from "@/lib/types";

// ─── PDF export ───────────────────────────────────────────────────────────────

async function exportPDF(el: HTMLElement, filename: string) {
  const { toPng }  = await import("html-to-image");
  const { jsPDF }  = await import("jspdf");

  // Capture at 2× — html-to-image handles oklch/lab colors that html2canvas cannot
  const dataUrl = await toPng(el, {
    pixelRatio: 2,
    backgroundColor: "#f9fafb",
    // Skip any nodes marked to be excluded (export buttons)
    filter: (node) =>
      !(node as HTMLElement).hasAttribute?.("data-html2canvas-ignore"),
  });

  // Build a temporary image to get natural dimensions
  const img = new Image();
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.src = dataUrl;
  });

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
    yOffset   -= pageH;
    pdf.addPage();
    pdf.addImage(dataUrl, "PNG", 0, yOffset, imgW, imgH);
    remaining -= pageH;
  }

  pdf.save(filename);
}

// ─── Excel export ─────────────────────────────────────────────────────────────

async function exportExcel(
  scope: string,
  blocks: AttributionBlock[],
  roi: RoiByYear[],
  monthly: MonthlyScenario[],
  activeYears: number[],
  allSelected: boolean,
  hero: { attrib: number | null; cotMkt: number; polizas: number; prima: number; roas: number | null },
  activeMonths: number[] = [],
) {
  const { utils, writeFile } = await import("xlsx");

  const wb = utils.book_new();
  const label = scope === "nacional" ? "Nacional" : "CDMX";
  const MONTH_ABBR = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const period = allSelected
    ? "Periodo completo"
    : activeYears.join(", ") + (activeMonths.length > 0
        ? ` (${activeMonths.map((m) => MONTH_ABBR[m - 1]).join(", ")})`
        : "");

  // ── Hoja 1: Resumen KPIs ──────────────────────────────────────────────────
  const kpiRows = [
    ["Modelo", label],
    ["Periodo", period],
    [],
    ["KPI", "Valor"],
    ["Atribucion de marketing (%)", hero.attrib != null ? hero.attrib / 100 : null],
    ["Cotizaciones atribuidas a marketing", Math.round(hero.cotMkt)],
    ["Polizas atribuidas a marketing", Math.round(hero.polizas)],
    ["Prima generada por marketing (MXN)", Math.round(hero.prima)],
    ["ROAS promedio ponderado (x)", hero.roas],
  ];
  const wsKpi = utils.aoa_to_sheet(kpiRows);
  wsKpi["E5"] = { z: "0.0%" };
  utils.book_append_sheet(wb, wsKpi, "Resumen KPIs");

  // ── Hoja 2: Descomposicion ────────────────────────────────────────────────
  const blockLabels: Record<string, string> = {
    mercado_tendencia: "Mercado y tendencia",
    agentes: "Fuerza comercial",
    marketing: "Marketing",
    estacionalidad: "Estacionalidad",
  };
  const totalCot = roi.reduce((s, r) => s + (r.cot_obs ?? 0), 0);
  const decompRows = [
    ["Bloque", "Contribucion (%)", "Cotizaciones (estimado)"],
    ...blocks
      .sort((a, b) => b.pct - a.pct)
      .map((b) => [
        blockLabels[b.block] ?? b.block,
        b.pct / 100,
        Math.round((b.pct / 100) * totalCot),
      ]),
    [],
    ["Total", 1, Math.round(totalCot)],
  ];
  const wsDecomp = utils.aoa_to_sheet(decompRows);
  utils.book_append_sheet(wb, wsDecomp, "Descomposicion");

  // ── Hoja 3: Evolucion por año ─────────────────────────────────────────────
  const filteredRoi = allSelected ? roi : roi.filter((r) => activeYears.includes(r.year));
  const yearRows = [
    ["Año", "Cotizaciones atribuidas", "Atribucion (%)", "Inversion (MXN)", "ROAS (x)", "Polizas", "Prima generada (MXN)", "Parcial"],
    ...filteredRoi.sort((a, b) => a.year - b.year).map((r) => {
      const pol = r.mkt_cot != null && r.close_rate != null ? r.mkt_cot * r.close_rate : null;
      const pri = pol != null && r.prima_avg != null ? pol * r.prima_avg : null;
      return [
        r.year,
        r.mkt_cot != null ? Math.round(r.mkt_cot) : null,
        r.attrib_pct != null ? r.attrib_pct / 100 : null,
        r.inv,
        r.roas,
        pol != null ? Math.round(pol) : null,
        pri != null ? Math.round(pri) : null,
        r.is_partial ? "Si" : "No",
      ];
    }),
  ];
  const wsYear = utils.aoa_to_sheet(yearRows);
  utils.book_append_sheet(wb, wsYear, "Evolucion por Anio");

  // ── Hoja 4: Evolucion mensual ─────────────────────────────────────────────
  const MONTH_NAMES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const filteredMonthly = monthly
    .filter((m) => activeYears.includes(m.year) && (m.obs != null || m.mkt_plan != null))
    .filter((m) => activeMonths.length === 0 || activeMonths.includes(m.month))
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
  const monthRows = [
    ["Año", "Mes", "Baseline", "Agentes", "Marketing (real)", "Marketing (plan)", "Observado", "Tipo"],
    ...filteredMonthly.map((m) => [
      m.year,
      MONTH_NAMES[m.month - 1],
      m.base != null ? Math.round(m.base) : null,
      m.agentes != null ? Math.round(m.agentes) : null,
      m.mkt_act != null ? Math.round(m.mkt_act) : null,
      m.mkt_plan != null ? Math.round(m.mkt_plan) : null,
      m.obs != null ? Math.round(m.obs) : null,
      m.obs != null ? "Real" : "Forecast",
    ]),
  ];
  const wsMonth = utils.aoa_to_sheet(monthRows);
  utils.book_append_sheet(wb, wsMonth, "Evolucion Mensual");

  const monthSuffix = activeMonths.length > 0 ? `_m${activeMonths.join("-")}` : "";
  writeFile(wb, `atribucion_${scope}_${activeYears.join("-")}${monthSuffix}.xlsx`);
}

// ─── hero KPI aggregation ────────────────────────────────────────────────────

function aggregateHero(roi: RoiByYear[], run: ModelRun, allSelected: boolean) {
  const cotMkt  = roi.reduce((s, r) => s + (r.mkt_cot ?? 0), 0);
  const polizas = roi.reduce((s, r) => s + (r.mkt_cot ?? 0) * (r.close_rate ?? 0), 0);
  const prima   = roi.reduce(
    (s, r) => s + (r.mkt_cot ?? 0) * (r.close_rate ?? 0) * (r.prima_avg ?? 0),
    0
  );
  let roasNum = 0, roasDen = 0;
  for (const r of roi) {
    if (r.roas != null && r.inv != null && r.inv > 0) {
      roasNum += r.roas * r.inv;
      roasDen += r.inv;
    }
  }
  const roas = roasDen > 0 ? roasNum / roasDen : null;

  if (allSelected || roi.length === 0) {
    return { attrib: run.attrib_mkt, cotMkt, polizas, prima, roas };
  }

  const totObs = roi.reduce((s, r) => s + (r.cot_obs ?? 0), 0);
  const attrib = totObs > 0 ? (cotMkt / totObs) * 100 : null;
  return { attrib, cotMkt, polizas, prima, roas };
}

// ─── ROI table ────────────────────────────────────────────────────────────────

function RoiTable({ roi }: { roi: RoiByYear[] }) {
  const sorted = [...roi].sort((a, b) => a.year - b.year);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[480px]">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-100">
            <th className="text-left pb-2 font-medium">Año</th>
            <th className="text-right pb-2 font-medium">Cotizaciones</th>
            <th className="text-right pb-2 font-medium">Atribución</th>
            <th className="text-right pb-2 font-medium">Inversión</th>
            <th className="text-right pb-2 font-medium">ROAS</th>
            <th className="text-right pb-2 font-medium">Pólizas</th>
            <th className="text-right pb-2 font-medium">Prima generada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {sorted.map((r) => {
            const polizas =
              r.mkt_cot != null && r.close_rate != null
                ? r.mkt_cot * r.close_rate
                : null;
            const prima =
              r.mkt_cot != null && r.close_rate != null && r.prima_avg != null
                ? r.mkt_cot * r.close_rate * r.prima_avg
                : null;
            return (
              <tr
                key={r.id}
                className={r.is_partial ? "text-gray-400" : "text-gray-900"}
              >
                <td className="py-2 font-medium">
                  {r.year}
                  {r.is_partial && (
                    <span className="ml-1 text-[10px] text-gray-400">*</span>
                  )}
                </td>
                <td className="py-2 text-right">{fmtNum(r.mkt_cot)}</td>
                <td className="py-2 text-right text-[#006729] font-medium">
                  {fmtPct(r.attrib_pct, 1)}
                </td>
                <td className="py-2 text-right">{fmtMXN(r.inv)}</td>
                <td className="py-2 text-right">{fmtRoas(r.roas)}</td>
                <td className="py-2 text-right">
                  {polizas != null ? fmtNum(polizas, 0) : "—"}
                </td>
                <td className="py-2 text-right">
                  {prima != null ? fmtMXNM(prima) : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sorted.some((r) => r.is_partial) && (
        <p className="text-[10px] text-gray-400 mt-2">* Año parcial</p>
      )}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  run: ModelRun;
  blocks: AttributionBlock[];
  roi: RoiByYear[];
  monthly: MonthlyScenario[];
  scope: "nacional" | "cdmx";
}

export function AttributionShell({ run, blocks, roi, monthly, scope }: Props) {
  // ── year selector state (same logic as DashboardShell) ────────────────────
  const allYears = useMemo(() => {
    const s = new Set(roi.filter((r) => r.mkt_cot != null).map((r) => r.year));
    return [...s].sort((a, b) => b - a);
  }, [roi]);

  const defaultYear = useMemo(() => {
    const withData = roi
      .filter((r) => r.mkt_cot != null)
      .sort((a, b) => b.year - a.year);
    return withData[0]?.year ?? allYears[0];
  }, [roi, allYears]);

  const [selected, setSelected] = useState<number[]>(
    defaultYear != null ? [defaultYear] : []
  );
  const [allSelected, setAllSelected] = useState(false);

  // Filtro de mes -- solo aplica a la sección "Evolución mensual" (ver
  // AttributionMonthly), acotado a exactamente un año activo. Se reinicia
  // cada vez que cambia la selección de año para no arrastrar un mes de
  // un año que ya no está activo.
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  const partialYears = useMemo(
    () => new Set(roi.filter((r) => r.is_partial).map((r) => r.year)),
    [roi]
  );

  function toggle(y: number) {
    setSelectedMonths([]);
    if (allSelected) {
      setAllSelected(false);
      setSelected([y]);
      return;
    }
    setSelected((prev) =>
      prev.includes(y)
        ? prev.length > 1 ? prev.filter((p) => p !== y) : prev
        : [...prev, y].sort((a, b) => a - b)
    );
  }

  function selectAll() {
    setSelectedMonths([]);
    setAllSelected(true);
    setSelected(allYears);
  }

  function toggleMonth(m: number) {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((p) => p !== m) : [...prev, m].sort((a, b) => a - b)
    );
  }

  function selectAllMonths() {
    setSelectedMonths([]);
  }

  const activeYears = allSelected ? allYears : selected;
  const hasPartialSelected = activeYears.some((y) => partialYears.has(y));

  // Filtro de mes -- afecta TODA la página (hero KPIs de la Sección 1 y el
  // chart de la Sección 3), igual que en Canales & ROI. Solo con 1 año activo.
  const monthFilterEnabled = !allSelected && activeYears.length === 1;
  const activeMonths = monthFilterEnabled ? selectedMonths : [];
  const availableMonths = monthFilterEnabled
    ? [...new Set(monthly.filter((m) => m.year === activeYears[0]).map((m) => m.month))].sort((a, b) => a - b)
    : [];

  // ── derived data for each section ────────────────────────────────────────
  const filteredRoi = allSelected
    ? roi
    : roi.filter((r) => activeYears.includes(r.year));

  const { attrib: annualAttrib, cotMkt: annualCotMkt, polizas: annualPolizas, prima: annualPrima, roas: annualRoas } =
    aggregateHero(filteredRoi, run, allSelected);

  // Cuando hay mes(es) especifico(s), los KPIs hero se recalculan a nivel
  // mes (mismo criterio que Etapa 1) -- ROAS se deja en "—": no hay
  // inversión total (modelados + no-modelados) confiable a nivel mes (ver
  // BITACORA turno 29, misma decisión que ModelCard.tsx).
  const monthRows = monthFilterEnabled && activeMonths.length > 0
    ? monthly.filter((m) => m.year === activeYears[0] && activeMonths.includes(m.month))
    : [];
  const monthKpis = monthRows.length > 0
    ? aggregateMonthlyAttribution(monthRows, roi.find((r) => r.year === activeYears[0]))
    : null;

  const attrib  = monthKpis ? monthKpis.attribPct : annualAttrib;
  const cotMkt  = monthKpis ? monthKpis.mktSum     : annualCotMkt;
  const polizas = monthKpis ? monthKpis.polizas ?? 0 : annualPolizas;
  const prima   = monthKpis ? monthKpis.prima   ?? 0 : annualPrima;
  const roas    = monthKpis ? null : annualRoas;

  const MONTH_ABBR = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const periodCaption = monthKpis
    ? `${activeMonths.map((m) => MONTH_ABBR[m - 1]).join("/")} ${activeYears[0]}`
    : "periodo seleccionado";

  // Total cotizaciones for full model period (waterfall is always full-period)
  const totalCot = useMemo(
    () => roi.reduce((s, r) => s + (r.cot_obs ?? 0), 0),
    [roi]
  );

  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={contentRef} className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* ─── header ─── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-gray-900 text-2xl font-semibold">
            Descomposicion del Modelo
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {scope === "nacional" ? "Nacional" : "CDMX"} — informacion al{" "}
            {/* timeZone:"UTC" obligatorio -- data_through es un `date` sin
                hora; sin esto, en husos detrás de UTC el día se corre uno
                hacia atrás (bug real reportado por el usuario 2026-09-24). */}
            {new Date(run.data_through).toLocaleDateString("es-MX", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </p>
        </div>

        {/* Export buttons — excluded from html2canvas capture */}
        <div className="flex items-center gap-2 print:hidden shrink-0" data-html2canvas-ignore>
          <button
            onClick={() => {
              if (contentRef.current) {
                const label = scope === "nacional" ? "nacional" : "cdmx";
                exportPDF(
                  contentRef.current,
                  `atribucion_${label}_${activeYears.join("-")}.pdf`
                );
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
              exportExcel(scope, blocks, roi, monthly, activeYears, allSelected, {
                attrib, cotMkt, polizas, prima, roas,
              }, activeMonths)
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

      {/* ─── year selector ─── */}
      {allYears.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Periodo:</span>

          <button
            onClick={selectAll}
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
            const isActive = !allSelected && selected.includes(y);
            const isPartial = partialYears.has(y);
            return (
              <button
                key={y}
                onClick={() => toggle(y)}
                className={[
                  "text-xs px-3 py-1.5 rounded-full font-medium transition-colors",
                  isActive
                    ? "bg-[#006729] text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                ].join(" ")}
              >
                {y}
                {isPartial && (
                  <span className={isActive ? " opacity-60" : " opacity-40"}>
                    *
                  </span>
                )}
              </button>
            );
          })}

          {allSelected && (
            <span className="text-[10px] text-gray-400 ml-2">
              Periodo completo del modelo
            </span>
          )}
          {!allSelected && hasPartialSelected && (
            <span className="text-[10px] text-amber-500 ml-2">
              * Año parcial - datos incompletos
            </span>
          )}
        </div>
      )}

      {/* ─── month selector -- afecta toda la página, igual que Canales & ROI ─── */}
      {monthFilterEnabled && availableMonths.length > 0 && (
        <MonthSelector
          availableMonths={availableMonths}
          selected={activeMonths}
          onToggle={toggleMonth}
          onSelectAll={selectAllMonths}
          enabled={monthFilterEnabled}
        />
      )}

      {/* ─── SECCION 1: Waterfall + KPIs hero ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-gray-900 font-semibold">
            Composicion de cotizaciones
          </h3>
          <p className="text-gray-500 text-xs mt-0.5">
            Contribucion de cada driver al total — periodo completo del modelo
          </p>
        </div>

        <AttributionWaterfall blocks={blocks} totalCot={totalCot > 0 ? totalCot : null} />

        {/* Hero KPIs — filtrables por año */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-gray-100 border-t border-gray-100 mt-4 -mx-5">
          <div className="bg-white px-4 py-4 rounded-bl-2xl md:rounded-bl-2xl">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
              Atribucion de marketing
            </p>
            <p className="text-2xl font-bold text-[#65A518] leading-none">
              {attrib != null ? fmtPct(attrib, 1) : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-1">del total de cotizaciones</p>
          </div>
          <div className="bg-white px-4 py-4">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
              Cotizaciones atribuidas a marketing
            </p>
            <p className="text-2xl font-bold text-gray-900 leading-none">
              {cotMkt > 0 ? fmtNum(cotMkt, 0) : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-1">{periodCaption}</p>
          </div>
          <div className="bg-white px-4 py-4">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
              Polizas atribuidas a marketing
            </p>
            <p className="text-2xl font-bold text-gray-900 leading-none">
              {polizas > 0 ? fmtNum(polizas, 0) : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-1">{periodCaption}</p>
          </div>
          <div className="bg-white px-4 py-4">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
              Prima generada por marketing
            </p>
            <p className="text-2xl font-bold text-gray-900 leading-none">
              {prima > 0 ? (monthKpis ? fmtMXN(prima) : fmtMXNM(prima)) : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-1">{periodCaption}</p>
          </div>
          <div className="bg-white px-4 py-4 md:rounded-br-2xl">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">
              ROAS promedio ponderado
            </p>
            <p className="text-2xl font-bold text-gray-900 leading-none">
              {roas != null ? fmtRoas(roas) : "—"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {monthKpis ? "n/d a nivel mes" : "por cada peso invertido"}
            </p>
          </div>
        </div>
      </div>

      {/* ─── SECCION 2: Evolución por año ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-gray-900 font-semibold mb-1">Evolucion de la atribucion</h3>
        <p className="text-gray-500 text-xs mb-4">
          % de cotizaciones atribuido a marketing — anos seleccionados
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <AttributionYearChart roi={filteredRoi} />
          <RoiTable roi={filteredRoi} />
        </div>
      </div>

      {/* ─── SECCION 3: Evolución mensual ─── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-gray-900 font-semibold mb-1">Evolucion mensual</h3>
        <p className="text-gray-500 text-xs mb-4">
          Baseline vs contribucion de marketing por mes
        </p>
        <AttributionMonthly
          monthly={monthly}
          selectedYears={activeYears}
          selectedMonths={activeMonths}
        />
        <p className="text-[10px] text-gray-400 mt-3">
          * El efecto estacional esta incluido dentro del Baseline.
        </p>
      </div>

    </div>
  );
}
