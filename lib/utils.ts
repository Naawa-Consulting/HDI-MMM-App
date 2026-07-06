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
