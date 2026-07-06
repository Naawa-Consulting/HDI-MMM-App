"use client";

import { useState, useMemo, useRef } from "react";
import { ModelCard } from "./ModelCard";
import { DashboardCharts } from "./DashboardCharts";
import type {
  ModelRun,
  AttributionBlock,
  Channel,
  RoiByYear,
  HeatmapData,
  MonthlyScenario,
} from "@/lib/types";

// ─── PDF export ───────────────────────────────────────────────────────────────

async function exportPDF(el: HTMLElement) {
  const { toPng } = await import("html-to-image");
  const { jsPDF } = await import("jspdf");

  const dataUrl = await toPng(el, {
    pixelRatio: 2,
    backgroundColor: "#f9fafb",
    filter: (node) =>
      !(node as HTMLElement).hasAttribute?.("data-html2canvas-ignore"),
  });

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
    yOffset -= pageH;
    pdf.addPage();
    pdf.addImage(dataUrl, "PNG", 0, yOffset, imgW, imgH);
    remaining -= pageH;
  }
  pdf.save("resumen_ejecutivo_MMM_HDI.pdf");
}

// ─── Excel export ─────────────────────────────────────────────────────────────

async function exportExcel(
  roiNacional: RoiByYear[],
  roiCdmx: RoiByYear[],
  blocksNacional: AttributionBlock[],
  blocksCdmx: AttributionBlock[],
  channelsNacional: Channel[],
  channelsCdmx: Channel[],
  runNacional: ModelRun | null,
  runCdmx: ModelRun | null,
) {
  const { utils, writeFile } = await import("xlsx");
  const wb = utils.book_new();

  // ── Hoja 1: Metricas del modelo ───────────────────────────────────────────
  const metaRows: unknown[][] = [
    ["Metrica", "Nacional", "CDMX"],
    ["Modelo ID", runNacional?.model_id ?? "—", runCdmx?.model_id ?? "—"],
    ["Datos hasta", runNacional?.data_through ?? "—", runCdmx?.data_through ?? "—"],
    ["R²adj", runNacional?.r2_adj ?? null, runCdmx?.r2_adj ?? null],
    ["MAPE (%)", runNacional?.mape != null ? runNacional.mape / 100 : null, runCdmx?.mape != null ? runCdmx.mape / 100 : null],
    ["Atrib. Marketing (%)", runNacional?.attrib_mkt != null ? runNacional.attrib_mkt / 100 : null, runCdmx?.attrib_mkt != null ? runCdmx.attrib_mkt / 100 : null],
  ];
  utils.book_append_sheet(wb, utils.aoa_to_sheet(metaRows), "Metricas Modelo");

  // ── Hoja 2: Atribucion ────────────────────────────────────────────────────
  const atribHeader = ["Bloque", "Nacional (%)", "CDMX (%)"];
  const blockNames = [...new Set([
    ...blocksNacional.map((b) => b.block),
    ...blocksCdmx.map((b) => b.block),
  ])];
  const atribRows: unknown[][] = [
    atribHeader,
    ...blockNames.map((name) => {
      const bn = blocksNacional.find((b) => b.block === name);
      const bc = blocksCdmx.find((b) => b.block === name);
      return [name, bn?.pct != null ? bn.pct / 100 : null, bc?.pct != null ? bc.pct / 100 : null];
    }),
  ];
  utils.book_append_sheet(wb, utils.aoa_to_sheet(atribRows), "Atribucion");

  // ── Hoja 3: ROI por año ───────────────────────────────────────────────────
  const roiHeader = ["Año", "Parcial", "Cotiz Obs", "Cotiz Mkt", "Atrib (%)", "Inversion (MXN)", "ROAS", "Tasa Conversion", "Prima Promedio"];
  const roiRowsNal: unknown[][] = roiNacional.map((r) => [
    r.year, r.is_partial ? "Si" : "No",
    r.cot_obs, r.mkt_cot,
    r.attrib_pct != null ? r.attrib_pct / 100 : null,
    r.inv, r.roas,
    r.close_rate != null ? r.close_rate / 100 : null,
    r.prima_avg,
  ]);
  const roiRowsCdmx: unknown[][] = roiCdmx.map((r) => [
    r.year, r.is_partial ? "Si" : "No",
    r.cot_obs, r.mkt_cot,
    r.attrib_pct != null ? r.attrib_pct / 100 : null,
    r.inv, r.roas,
    r.close_rate != null ? r.close_rate / 100 : null,
    r.prima_avg,
  ]);
  const roiRows: unknown[][] = [
    ["NACIONAL"],
    roiHeader,
    ...roiRowsNal,
    [],
    ["CDMX"],
    roiHeader,
    ...roiRowsCdmx,
  ];
  utils.book_append_sheet(wb, utils.aoa_to_sheet(roiRows), "ROI por Año");

  // ── Hoja 4: Canales ───────────────────────────────────────────────────────
  const chHeader = ["Canal", "Modelado", "Inversion (MXN)", "Share Inv (%)", "Contrib Cotiz", "Share Contrib (%)", "ROAS", "Saturacion (%)"];
  const chRowsNal: unknown[][] = channelsNacional.map((c) => [
    c.canal, c.is_modeled ? "Si" : "No",
    c.inv, c.share_inv != null ? c.share_inv / 100 : null,
    c.contrib_cot, c.share_contrib != null ? c.share_contrib / 100 : null,
    c.roas, c.sat_op != null ? c.sat_op / 100 : null,
  ]);
  const chRowsCdmx: unknown[][] = channelsCdmx.map((c) => [
    c.canal, c.is_modeled ? "Si" : "No",
    c.inv, c.share_inv != null ? c.share_inv / 100 : null,
    c.contrib_cot, c.share_contrib != null ? c.share_contrib / 100 : null,
    c.roas, c.sat_op != null ? c.sat_op / 100 : null,
  ]);
  const chRows: unknown[][] = [
    ["NACIONAL"],
    chHeader,
    ...chRowsNal,
    [],
    ["CDMX"],
    chHeader,
    ...chRowsCdmx,
  ];
  utils.book_append_sheet(wb, utils.aoa_to_sheet(chRows), "Canales");

  writeFile(wb, "resumen_ejecutivo_MMM_HDI.xlsx");
}

interface Props {
  runNacional: ModelRun | null;
  runCdmx: ModelRun | null;
  blocksNacional: AttributionBlock[];
  blocksCdmx: AttributionBlock[];
  channelsNacional: Channel[];
  channelsCdmx: Channel[];
  roiNacional: RoiByYear[];
  roiCdmx: RoiByYear[];
  heatmapNacional: HeatmapData[];
  heatmapCdmx: HeatmapData[];
  monthlyNacional: MonthlyScenario[];
  monthlyCdmx: MonthlyScenario[];
}

export function DashboardShell({
  runNacional,
  runCdmx,
  blocksNacional,
  blocksCdmx,
  channelsNacional,
  channelsCdmx,
  roiNacional,
  roiCdmx,
  heatmapNacional,
  heatmapCdmx,
  monthlyNacional,
  monthlyCdmx,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  // Only show years where at least one model has actual attribution data.
  // Years with mkt_cot=null (e.g. 2026 partial/planned) are excluded to
  // avoid an empty-looking card when selected.
  const allYears = useMemo(() => {
    const s = new Set([
      ...roiNacional.filter((r) => r.mkt_cot != null).map((r) => r.year),
      ...roiCdmx.filter((r) => r.mkt_cot != null).map((r) => r.year),
    ]);
    return [...s].sort((a, b) => b - a);
  }, [roiNacional, roiCdmx]);

  // Default to the most recent year with attribution data (including partial years).
  const defaultYear = useMemo(() => {
    const withData = [...roiNacional, ...roiCdmx]
      .filter((r) => r.mkt_cot != null)
      .sort((a, b) => b.year - a.year);
    return withData[0]?.year ?? allYears[0];
  }, [roiNacional, roiCdmx, allYears]);

  const [selected, setSelected] = useState<number[]>(
    defaultYear != null ? [defaultYear] : []
  );
  // chipYear = last year the user clicked; drives channel chips display
  const [chipYear, setChipYear] = useState<number | null>(defaultYear ?? null);
  // "all" = every available year selected (model-period view)
  const [allSelected, setAllSelected] = useState(false);

  const partialYears = useMemo(
    () =>
      new Set(
        [...roiNacional, ...roiCdmx]
          .filter((r) => r.is_partial)
          .map((r) => r.year)
      ),
    [roiNacional, roiCdmx]
  );

  function toggle(y: number) {
    setChipYear(y);
    if (allSelected) {
      // Exit "Todos" mode: select only the clicked year
      setAllSelected(false);
      setSelected([y]);
      return;
    }
    setSelected((prev) => {
      if (prev.includes(y)) {
        return prev.length > 1 ? prev.filter((p) => p !== y) : prev;
      }
      return [...prev, y].sort((a, b) => a - b);
    });
  }

  function selectAll() {
    setAllSelected(true);
    setSelected(allYears);
    // chips show most recent year in "Todos" mode
    setChipYear(allYears[0] ?? null);
  }

  // The years actually passed to cards: individual selection OR all years
  const activeYears = allSelected ? allYears : selected;

  const hasPartialSelected = activeYears.some((y) => partialYears.has(y));

  return (
    <div ref={contentRef}>
      {/* Export buttons */}
      <div className="flex justify-end gap-2 mb-4" data-html2canvas-ignore>
        <button
          onClick={() => contentRef.current && exportPDF(contentRef.current)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 13h10M8 3v7m0 0-3-3m3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          PDF
        </button>
        <button
          onClick={() => exportExcel(roiNacional, roiCdmx, blocksNacional, blocksCdmx, channelsNacional, channelsCdmx, runNacional, runCdmx)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 13h10M8 3v7m0 0-3-3m3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Excel
        </button>
      </div>

      {allYears.length > 0 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-xs text-gray-500 font-medium">Periodo:</span>

          {/* "Todos" pill — model-period aggregate */}
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
            const isSelected = !allSelected && selected.includes(y);
            const isChip = !allSelected && chipYear === y;
            const isPartial = partialYears.has(y);
            return (
              <button
                key={y}
                onClick={() => toggle(y)}
                className={[
                  "text-xs px-3 py-1.5 rounded-full font-medium transition-colors",
                  isSelected
                    ? "bg-[#006729] text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200",
                ].join(" ")}
              >
                {y}
                {isPartial && (
                  <span className={isSelected ? " opacity-60" : " opacity-40"}>
                    *
                  </span>
                )}
                {/* underline dot: indicates which year drives the channel chips */}
                {isChip && selected.length > 1 && (
                  <span className="ml-1 inline-block w-1 h-1 rounded-full bg-white opacity-80 align-middle" />
                )}
              </button>
            );
          })}

          {allSelected && (
            <span className="text-[10px] text-gray-400 ml-2">
              Periodo completo del modelo - ROAS ponderado por inversion
            </span>
          )}
          {!allSelected && hasPartialSelected && (
            <span className="text-[10px] text-amber-500 ml-2">
              * Ano parcial - datos incompletos
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <ModelCard
          title="Modelo Nacional"
          run={runNacional}
          blocks={blocksNacional}
          channels={channelsNacional}
          roi={roiNacional}
          heatmap={heatmapNacional}
          selectedYears={activeYears}
          chipYear={chipYear}
        />
        <ModelCard
          title="Modelo CDMX"
          run={runCdmx}
          blocks={blocksCdmx}
          channels={channelsCdmx}
          roi={roiCdmx}
          heatmap={heatmapCdmx}
          selectedYears={activeYears}
          chipYear={chipYear}
        />
      </div>

      <DashboardCharts
        monthlyNacional={monthlyNacional}
        monthlyCdmx={monthlyCdmx}
        selectedYears={activeYears}
      />
    </div>
  );
}
