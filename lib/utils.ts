import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function fmtMXN(value: number | null | undefined, decimals = 0): string {
  if (value == null) return "—";
  if (Math.abs(value) >= 1_000_000_000)
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(value) >= 1_000_000)
    return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000)
    return `$${(value / 1_000).toFixed(0)}k`;
  return `$${value.toFixed(decimals)}`;
}

export function fmtPct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return `${value.toFixed(decimals)}%`;
}

export function fmtNum(value: number | null | undefined, decimals = 0): string {
  if (value == null) return "—";
  return value.toLocaleString("es-MX", { maximumFractionDigits: decimals });
}

// Shows MXN amounts in millions — avoids "B" (billion), which in Spanish means 10¹²
export function fmtMXNM(value: number | null | undefined): string {
  if (value == null) return "—";
  const millions = Math.round(value / 1_000_000);
  return `$${millions.toLocaleString("es-MX")} M`;
}

export function fmtRoas(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}x`;
}

// Agrega filas de monthly_scenarios (uno o varios meses de un mismo año) a
// atribución/pólizas/prima estimadas. Mismo criterio de mktValue/denom que
// AttributionMonthly.tsx (real=mkt_act, forecast=mkt_plan) para que ambas
// vistas nunca diverjan. Pólizas/prima usan la tasa de cierre y prima
// promedio ANUAL (roi_by_year) — no existe grano mensual real para esas dos.
export function aggregateMonthlyAttribution(
  rows: {
    obs: number | null;
    base: number | null;
    agentes: number | null;
    estac: number | null;
    mkt_act: number | null;
    mkt_plan: number | null;
  }[],
  roiYear: { close_rate: number | null; prima_avg: number | null } | undefined,
) {
  let mktSum = 0;
  let denomSum = 0;
  for (const m of rows) {
    const isForecast = m.obs == null;
    const mktValue = isForecast ? m.mkt_plan : m.mkt_act;
    const baseline = m.base != null ? m.base + (m.estac ?? 0) : null;
    const denom = m.obs ?? ((baseline ?? 0) + (m.agentes ?? 0) + (mktValue ?? 0));
    if (mktValue != null) mktSum += mktValue;
    denomSum += denom;
  }
  const attribPct = denomSum > 0 ? (mktSum / denomSum) * 100 : null;
  const closeRate = roiYear?.close_rate ?? null;
  const primaAvg = roiYear?.prima_avg ?? null;
  // close_rate se guarda en roi_by_year como fracción (0.1477 = 14.77%), NO
  // como 0-100 -- verificado directo en Supabase (Nacional y CDMX). Mismo
  // criterio que ya usan aggregateHero()/RoiTable.tsx en AttributionShell.tsx:
  // mkt_cot * close_rate, SIN dividir entre 100 (bug real: dividía de más,
  // pólizas/prima del hero mensual salían 100x menores que la tabla de abajo).
  const polizas = closeRate != null ? mktSum * closeRate : null;
  const prima = polizas != null && primaAvg != null ? polizas * primaAvg : null;
  return { mktSum, attribPct, polizas, prima };
}

export const SCOPE_LABELS: Record<string, string> = {
  nacional: "Nacional",
  cdmx: "CDMX",
};

export const RUN_TYPE_LABELS: Record<string, string> = {
  scoring: "Actualización mensual",
  recalibration: "Recalibración",
};

// HDI brand colors for charts
export const CHART_COLORS = {
  youtube:      "#E60018",  // HDI Rojo
  ooh:          "#003960",  // HDI Azul
  cartelera:    "#003960",
  programmatic: "#00A3A8",  // HDI Teal
  ctv:          "#4CBFC2",  // Teal 70%
  radio:        "#809CB0",  // Azul 50%
  pr:           "#65A518",  // Verde Universal
  meta:         "#93C05D",  // GU 70%
  sem:          "#4C7490",  // Azul 70%
  camion:       "#B3C3D0",  // Azul 30%
  display:      "#4CBFC2",  // Teal 70%
  marketing:    "#65A518",  // GU verde (consistent with dashboard bar)
  baseline:     "#e5e7eb",
  observed:     "#111827",
  fitted:       "#006729",  // HDI Verde
};
