"use client";

import type { HeatmapData } from "@/lib/types";
import { fmtPct, fmtRoas } from "@/lib/utils";

interface Props {
  data: HeatmapData[];
}

function heatColor(pct: number | null): string {
  if (pct == null) return "#f9fafb";
  const t = Math.min(1, Math.max(0, pct / 25));  // 0-25% range -> 0-1
  const r = Math.round(230 * (1 - t) + 0 * t);
  const g = Math.round(255 * (1 - t) + 183 * t);
  const b = Math.round(255 * (1 - t) + 24 * t);
  return `rgb(${r},${g},${b})`;
}

export function HeatmapGrid({ data }: Props) {
  const canals = [...new Set(data.map((d) => d.canal))];
  const years = [...new Set(data.map((d) => d.year))].sort();

  const lookup = new Map<string, HeatmapData>();
  data.forEach((d) => lookup.set(`${d.canal}__${d.year}`, d));

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
        <tbody className="space-y-1">
          {canals.map((canal) => (
            <tr key={canal}>
              <td className="pr-4 py-1.5 text-gray-700 font-medium whitespace-nowrap">
                {canal}
              </td>
              {years.map((year) => {
                const cell = lookup.get(`${canal}__${year}`);
                return (
                  <td key={year} className="px-1 py-1">
                    <div
                      className="rounded-lg px-2 py-1.5 text-center"
                      style={{ backgroundColor: heatColor(cell?.contrib_pct ?? null) }}
                    >
                      <p className="font-semibold text-gray-900">
                        {cell?.roim != null ? fmtRoas(cell.roim) : "—"}
                      </p>
                      <p className="text-gray-600 text-[10px]">
                        {cell?.contrib_pct != null ? fmtPct(cell.contrib_pct, 1) : "—"}
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
