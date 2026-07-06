"use client";

import { useRef } from "react";
import { OptimizationWaterfall } from "@/components/charts/OptimizationWaterfall";
import { OptimizationMixDonut } from "@/components/charts/OptimizationMixDonut";
import { OptimizationYearSelector } from "@/components/OptimizationYearSelector";
import { fmtMXN, fmtMXNM, fmtNum, fmtPct, fmtRoas } from "@/lib/utils";
import type { OptimizationRun, OptimizationTotal } from "@/lib/types";

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
  year: number,
  runs: OptimizationRun[],
  totals: OptimizationTotal | null,
) {
  const { utils, writeFile } = await import("xlsx");
  const wb    = utils.book_new();
  const label = scope === "nacional" ? "Nacional" : "CDMX";

  // ── Hoja 1: Resumen KPIs ──────────────────────────────────────────────────
  const kpiRows = [
    ["Modelo", label],
    ["Año", year],
    [],
    ["Metrica", "Referencia", "Optimo", "Uplift"],
    [
      "Presupuesto total (MXN)",
      totals?.budget_an ?? null,
      totals?.budget_an ?? null,
      null,
    ],
    [
      "Cotizaciones de marketing",
      totals?.ref_cotiz ?? null,
      totals?.opt_cotiz ?? null,
      totals?.uplift_ratio != null ? totals.uplift_ratio - 1 : null,
    ],
    [
      "Polizas de marketing",
      totals?.ref_pol ?? null,
      totals?.opt_pol ?? null,
      totals?.ref_pol && totals?.opt_pol && totals.ref_pol > 0
        ? (totals.opt_pol - totals.ref_pol) / totals.ref_pol
        : null,
    ],
    [
      "Prima atribuida (MXN)",
      totals?.ref_prima ?? null,
      totals?.opt_prima ?? null,
      totals?.ref_prima && totals?.opt_prima && totals.ref_prima > 0
        ? (totals.opt_prima - totals.ref_prima) / totals.ref_prima
        : null,
    ],
    [
      "ROAS (prima / peso inv.)",
      totals?.ref_roas ?? null,
      totals?.opt_roas ?? null,
      null,
    ],
  ];
  const wsKpi = utils.aoa_to_sheet(kpiRows);
  // Format uplift column as percentage
  utils.book_append_sheet(wb, wsKpi, "Resumen");

  // ── Hoja 2: Detalle por canal ─────────────────────────────────────────────
  const chRows = [
    ["Modelo", label],
    ["Año", year],
    [],
    [
      "Canal", "Modelado", "Activo",
      "Inv. Ref. (MXN)", "Inv. Opt. (MXN)", "Delta (MXN)",
      "Mix Ref. (%)", "Mix Opt. (%)",
      "Cotiz. Ref.", "Cotiz. Opt.", "Uplift canal",
      "Saturacion Ref. (%)", "Ret. Marginal (cot/$1k)",
    ],
    ...runs.map((r) => {
      const delta = (r.opt_sp ?? 0) - (r.ref_sp ?? 0);
      return [
        r.canal,
        r.is_modeled ? "Si" : "No",
        r.is_active  ? "Si" : "No (bloq.)",
        r.ref_sp,
        r.opt_sp,
        delta !== 0 ? delta : null,
        r.ref_mix != null ? r.ref_mix / 100 : null,
        r.opt_mix != null ? r.opt_mix / 100 : null,
        r.ref_cot != null ? Math.round(r.ref_cot) : null,
        r.opt_cot != null ? Math.round(r.opt_cot) : null,
        r.uplift ?? null,
        r.sat_ref != null ? r.sat_ref / 100 : null,
        r.marg ?? null,
      ];
    }),
  ];
  const wsCh = utils.aoa_to_sheet(chRows);
  utils.book_append_sheet(wb, wsCh, "Detalle por Canal");

  // ── Hoja 3: Mix inversión ─────────────────────────────────────────────────
  const modeled = runs.filter((r) => r.is_modeled);
  const mixRows = [
    ["Canal", "Mix Referencia (%)", "Mix Optimo (%)", "Delta Mix (pp)"],
    ...modeled.map((r) => [
      r.canal,
      r.ref_mix != null ? r.ref_mix / 100 : null,
      r.opt_mix != null ? r.opt_mix / 100 : null,
      r.ref_mix != null && r.opt_mix != null ? (r.opt_mix - r.ref_mix) / 100 : null,
    ]),
  ];
  const wsMix = utils.aoa_to_sheet(mixRows);
  utils.book_append_sheet(wb, wsMix, "Mix Inversion");

  writeFile(wb, `optimizacion_${scope}_${year}.xlsx`);
}

// ─── Methodology config ───────────────────────────────────────────────────────

const METHODOLOGY: Record<string, Record<number, { label: string; bg: string; dot: string }>> = {
  nacional: {
    2025: { label: "Backward — validacion 2025. Mismo presupuesto ejecutado en 2025.", bg: "bg-blue-50 border-blue-200 text-blue-800", dot: "bg-blue-400" },
    2026: { label: "Forward — planeacion 2026. Presupuesto planeado 2026.",             bg: "bg-[#f0f9e8] border-[#c5e49a] text-[#2d5a0a]", dot: "bg-[#65A518]" },
  },
  cdmx: {
    2025: { label: "Backward — validacion 2025. Mismo presupuesto ejecutado en 2025.", bg: "bg-blue-50 border-blue-200 text-blue-800", dot: "bg-blue-400" },
    2026: { label: "Forward — planeacion 2026. Presupuesto planeado 2026.",             bg: "bg-[#f0f9e8] border-[#c5e49a] text-[#2d5a0a]", dot: "bg-[#65A518]" },
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  scope:  "nacional" | "cdmx";
  year:   number;
  runs:   OptimizationRun[];
  totals: OptimizationTotal | null;
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function OptimizationShell({ scope, year, runs, totals }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const scopeLabel = scope === "nacional" ? "Nacional" : "CDMX";

  const upliftCot = totals?.uplift_ratio != null ? (totals.uplift_ratio - 1) * 100 : null;
  const upliftPol =
    totals?.ref_pol && totals?.opt_pol && totals.ref_pol > 0
      ? ((totals.opt_pol - totals.ref_pol) / totals.ref_pol) * 100
      : null;
  const upliftPrima =
    totals?.ref_prima && totals?.opt_prima && totals.ref_prima > 0
      ? ((totals.opt_prima - totals.ref_prima) / totals.ref_prima) * 100
      : null;

  const meth = METHODOLOGY[scope]?.[year];

  return (
    <div ref={contentRef} className="p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="mb-5 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-gray-900 text-2xl font-semibold">
            Optimizacion de presupuesto — {scopeLabel}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Reasignacion greedy maximizando cotizaciones atribuidas al marketing
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden shrink-0" data-html2canvas-ignore>
          <OptimizationYearSelector current={year} />
          <button
            onClick={() =>
              exportPDF(contentRef.current!, `optimizacion_${scope}_${year}.pdf`)
            }
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            PDF
          </button>
          <button
            onClick={() => exportExcel(scope, year, runs, totals)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel
          </button>
        </div>
      </div>

      {/* ── Methodology banner ──────────────────────────────────────────────── */}
      {meth && (
        <div className={`rounded-xl border px-4 py-3 mb-5 text-sm flex items-start gap-3 ${meth.bg}`}>
          <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${meth.dot}`} />
          <span>{meth.label}</span>
        </div>
      )}

      {/* ── KPI tiles ───────────────────────────────────────────────────────── */}
      {totals && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-gray-500 text-xs mb-1">Presupuesto total</p>
              <p className="text-gray-900 font-semibold">{fmtMXN(totals.budget_an)}</p>
              <p className="text-gray-400 text-xs mt-0.5">Sin cambio de envelope</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-gray-500 text-xs mb-1">Cotizaciones referencia</p>
              <p className="text-gray-900 font-semibold">{fmtNum(totals.ref_cotiz)}</p>
              <p className="text-gray-400 text-xs mt-0.5">Aporte de marketing</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-gray-500 text-xs mb-1">Cotizaciones optimo</p>
              <p className="text-[#006729] font-semibold">{fmtNum(totals.opt_cotiz)}</p>
              <p className="text-gray-400 text-xs mt-0.5">Aporte de marketing</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-gray-500 text-xs mb-1">Uplift cotizaciones</p>
              <p className={`font-semibold text-lg ${upliftCot != null && upliftCot > 0 ? "text-[#65A518]" : "text-gray-900"}`}>
                {upliftCot != null ? `+${fmtPct(upliftCot, 0)}` : "—"}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">Sobre aporte de mkt</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-gray-500 text-xs mb-1">Polizas de marketing</p>
              <div className="flex items-baseline gap-2">
                <p className="text-[#006729] font-semibold">{fmtNum(totals.opt_pol)}</p>
                {upliftPol != null && (
                  <span className="text-xs text-[#65A518] font-medium">+{fmtPct(upliftPol, 0)}</span>
                )}
              </div>
              <p className="text-gray-400 text-xs mt-0.5">Ref: {fmtNum(totals.ref_pol)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-gray-500 text-xs mb-1">Prima atribuida</p>
              <div className="flex items-baseline gap-2">
                <p className="text-[#006729] font-semibold">{fmtMXNM(totals.opt_prima)}</p>
                {upliftPrima != null && (
                  <span className="text-xs text-[#65A518] font-medium">+{fmtPct(upliftPrima, 0)}</span>
                )}
              </div>
              <p className="text-gray-400 text-xs mt-0.5">Ref: {fmtMXNM(totals.ref_prima)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-gray-500 text-xs mb-1">ROAS (prima / peso inv.)</p>
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-gray-400 text-xs">Ref</p>
                  <p className="text-gray-700 font-semibold">{fmtRoas(totals.ref_roas)}</p>
                </div>
                <span className="text-gray-300 text-lg">&#8594;</span>
                <div>
                  <p className="text-gray-400 text-xs">Opt</p>
                  <p className="text-[#006729] font-semibold">{fmtRoas(totals.opt_roas)}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Mix donuts ──────────────────────────────────────────────────────── */}
      {runs.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
          <h3 className="text-gray-900 font-semibold mb-4">Mix de inversion: Referencia vs Optimo</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <OptimizationMixDonut runs={runs} variant="ref" title="Referencia" />
            <OptimizationMixDonut runs={runs} variant="opt" title="Optimo" />
          </div>
        </div>
      )}

      {/* ── Delta chart ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
        <h3 className="text-gray-900 font-semibold mb-1">Cambio de inversion por canal</h3>
        <p className="text-gray-500 text-xs mb-4">Verde = aumentar, Rojo = reducir, Gris = bloqueado / excluido</p>
        <OptimizationWaterfall runs={runs} />
      </div>

      {/* ── Detail table ────────────────────────────────────────────────────── */}
      {runs.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm overflow-auto">
          <h3 className="text-gray-900 font-semibold mb-4">Detalle por canal</h3>
          <table className="w-full text-sm min-w-[780px]">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Canal</th>
                <th className="text-right pb-2 font-medium">Inv. Ref.</th>
                <th className="text-right pb-2 font-medium">Inv. Opt.</th>
                <th className="text-right pb-2 font-medium">Delta</th>
                <th className="text-right pb-2 font-medium">Mix Ref.</th>
                <th className="text-right pb-2 font-medium">Mix Opt.</th>
                <th className="text-right pb-2 font-medium">Cotiz. Ref.</th>
                <th className="text-right pb-2 font-medium">Cotiz. Opt.</th>
                <th className="text-right pb-2 font-medium">Uplift</th>
                <th className="text-right pb-2 font-medium">Sat. Ref.</th>
                <th className="text-right pb-2 font-medium">Ret. Marg.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {runs.map((r) => {
                const delta    = (r.opt_sp ?? 0) - (r.ref_sp ?? 0);
                const isLocked = !r.is_active;
                return (
                  <tr key={r.id} className={isLocked ? "text-gray-400" : "text-gray-900"}>
                    <td className="py-2.5 font-medium">
                      {r.canal}
                      {!r.is_modeled && <span className="ml-1 text-xs text-gray-400">(no mod.)</span>}
                      {isLocked && <span className="ml-1 text-xs text-amber-600">bloq.</span>}
                    </td>
                    <td className="py-2.5 text-right">{fmtMXN(r.ref_sp)}</td>
                    <td className="py-2.5 text-right">{fmtMXN(r.opt_sp)}</td>
                    <td className={`py-2.5 text-right font-medium ${delta > 500 ? "text-[#65A518]" : delta < -500 ? "text-[#E60018]" : "text-gray-400"}`}>
                      {Math.abs(delta) > 500 ? `${delta > 0 ? "+" : ""}${fmtMXN(delta)}` : "—"}
                    </td>
                    <td className="py-2.5 text-right">{fmtPct(r.ref_mix, 1)}</td>
                    <td className="py-2.5 text-right">
                      {r.opt_mix != null && r.ref_mix != null && Math.abs(r.opt_mix - r.ref_mix) > 0.05
                        ? <span className={r.opt_mix > r.ref_mix ? "text-[#65A518] font-medium" : "text-[#E60018] font-medium"}>{fmtPct(r.opt_mix, 1)}</span>
                        : fmtPct(r.opt_mix, 1)
                      }
                    </td>
                    <td className="py-2.5 text-right text-gray-600">
                      {r.ref_cot != null ? fmtNum(r.ref_cot, 0) : "—"}
                    </td>
                    <td className="py-2.5 text-right">
                      {r.opt_cot != null
                        ? <span className="text-[#006729]">{fmtNum(r.opt_cot, 0)}</span>
                        : "—"}
                    </td>
                    <td className={`py-2.5 text-right font-medium ${r.uplift != null && r.uplift > 0 ? "text-[#65A518]" : "text-gray-500"}`}>
                      {r.uplift != null && r.is_modeled ? `+${fmtPct(r.uplift * 100, 1)}` : "—"}
                    </td>
                    <td className="py-2.5 text-right">
                      {r.sat_ref != null ? fmtPct(r.sat_ref, 0) : "—"}
                    </td>
                    <td className="py-2.5 text-right text-gray-500 text-xs">
                      {r.marg != null && r.is_modeled ? fmtNum(r.marg, 2) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-3">
            Ret. Marg. = cotizaciones incrementales por peso adicional invertido en el margen.
          </p>
        </div>
      )}
    </div>
  );
}
