"use client";

import { useState } from "react";
import { fmtRoas } from "@/lib/utils";
import type { MarginInfo } from "@/lib/margin";

// Contenido del hover de margen (compartido con los tooltips de recharts).
export function MarginTipBody({ margin }: { margin: MarginInfo }) {
  const multi = margin.parts.length > 1;
  return (
    <div className="text-[11px] leading-snug">
      <p className="font-semibold text-gray-900">
        {multi ? "Margen efectivo" : "Margen aplicado"}: {margin.pct.toFixed(2)}%
      </p>
      <p className="text-gray-500 mt-0.5">
        ROAS = prima atribuida × margen de contribución / inversión
      </p>
      {multi ? (
        <ul className="mt-1 text-gray-600">
          {margin.parts.map((p) => (
            <li key={p.year}>
              {p.year}: {p.pct.toFixed(2)}%
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-600 mt-0.5">
          {margin.parts[0].year}: {margin.parts[0].note}
        </p>
      )}
    </div>
  );
}

interface Props {
  value: number | null | undefined;
  margin: MarginInfo | null | undefined;
  className?: string;
  empty?: string;
}

// ROAS con hover que indica el % de margen aplicado según los filtros activos.
// Tooltip en posición fija: no lo recortan los contenedores con overflow
// (tablas, heatmap).
export function RoasValue({ value, margin, className = "", empty = "—" }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const text = value != null ? fmtRoas(value) : empty;
  if (value == null || !margin) return <span className={className}>{text}</span>;

  return (
    <span
      className={`cursor-help underline decoration-dotted decoration-current/40 underline-offset-2 ${className}`}
      onMouseEnter={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: r.left + r.width / 2, y: r.top });
      }}
      onMouseLeave={() => setPos(null)}
    >
      {text}
      {pos && (
        <span
          role="tooltip"
          className="pointer-events-none rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md text-left font-normal normal-case no-underline"
          style={{
            position: "fixed",
            left: pos.x,
            top: pos.y - 8,
            transform: "translate(-50%, -100%)",
            zIndex: 60,
            minWidth: 190,
            maxWidth: 260,
            textDecoration: "none",
          }}
        >
          <MarginTipBody margin={margin} />
        </span>
      )}
    </span>
  );
}
