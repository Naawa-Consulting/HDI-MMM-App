// Margen de contribución aplicado al ROAS (definido con el cliente 2026-10-13).
//
//   ROAS = prima atribuida a marketing × margen / inversión
//
// Margen = (ingreso por prima - siniestros - reaseguro - costo de adquisición
// [+ componente de pérdida]) / ingreso por prima, antes de gastos
// administrativos. Fuente: Reporte Financiero HDI (Autos Residentes, todas las
// oficinas, IFRS 17).
//
// Reglas acordadas:
//   - Se usa ene-nov de cada año (diciembre trae ajustes de cierre de reservas).
//   - 2022 no tiene reporte: usa el margen de 2023.
//   - CDMX usa el margen nacional.
//   - 2026 solo existe ene-ago (8.07%); ACTUALIZAR cuando el cliente envíe más
//     meses. Cualquier año posterior al último definido usa el último.
//
// Supabase guarda el ROAS BRUTO (prima / inversión). El margen se aplica en
// lib/queries/*.ts, de modo que todo `roas` / `roim` / `ref_roas` que llega a la
// UI ya es el ROAS ajustado.

// Año al que corresponde la foto de la tabla `channels` (ver push_nacional.py).
export const CHANNELS_SNAPSHOT_YEAR = 2025;

export interface MarginDef {
  pct: number;      // 8.01 = 8.01%
  basis: string;    // periodo del reporte del que sale
}

export const MARGIN_BY_YEAR: Record<number, MarginDef> = {
  2023: { pct: 3.28, basis: "ene-nov" },
  2024: { pct: 6.30, basis: "ene-nov" },
  2025: { pct: 8.01, basis: "ene-nov" },
  2026: { pct: 8.07, basis: "ene-ago" },
};

const YEARS = Object.keys(MARGIN_BY_YEAR).map(Number).sort((a, b) => a - b);
const FIRST_YEAR = YEARS[0];
const LAST_YEAR = YEARS[YEARS.length - 1];

export interface MarginForYear extends MarginDef {
  year: number;       // año solicitado
  refYear: number;    // año del reporte realmente usado
}

export function marginForYear(year: number): MarginForYear {
  const refYear = Math.min(Math.max(year, FIRST_YEAR), LAST_YEAR);
  return { ...MARGIN_BY_YEAR[refYear], year, refYear };
}

export function marginFrac(year: number): number {
  return marginForYear(year).pct / 100;
}

/** ROAS bruto (prima / inversión) -> ROAS ajustado por el margen del año. */
export function applyMargin(roas: number | null | undefined, year: number): number | null {
  return roas == null ? null : roas * marginFrac(year);
}

// ─── información para el hover ───────────────────────────────────────────────

export interface MarginPart {
  year: number;
  pct: number;
  note: string;
}

export interface MarginInfo {
  pct: number;           // margen efectivo (igual al del año si es uno solo)
  parts: MarginPart[];   // desglose por año (1 elemento si es un solo año)
}

function partFor(year: number): MarginPart {
  const m = marginForYear(year);
  const note =
    m.refYear !== m.year
      ? `usa el margen de ${m.refYear} (${m.basis}), sin reporte ${m.year}`
      : m.basis === "ene-ago"
        ? "ene-ago, se actualizará"
        : m.basis;
  return { year, pct: m.pct, note };
}

/** Margen aplicado a un solo año. */
export function marginInfoForYear(year: number): MarginInfo {
  const p = partFor(year);
  return { pct: p.pct, parts: [p] };
}

/**
 * Margen efectivo de un ROAS agregado sobre varios años. `adjusted` es el
 * aporte de cada año al numerador del ROAS YA ajustado (roas × inversión, o
 * prima × margen). Margen efectivo = Σ ajustado / Σ (ajustado / margen), es
 * decir, el margen ponderado por prima.
 */
export function combineMargins(parts: { year: number; adjusted: number }[]): MarginInfo | null {
  const valid = parts.filter((p) => p.adjusted > 0);
  if (!valid.length) return null;
  const byYear = new Map<number, number>();
  for (const p of valid) byYear.set(p.year, (byYear.get(p.year) ?? 0) + p.adjusted);
  const years = [...byYear.keys()].sort((a, b) => a - b);
  let num = 0;
  let den = 0;
  for (const y of years) {
    const a = byYear.get(y)!;
    num += a;
    den += a / marginFrac(y);
  }
  return { pct: (num / den) * 100, parts: years.map(partFor) };
}
