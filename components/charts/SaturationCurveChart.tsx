"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { SaturationCurve } from "@/lib/types";
import { fmtNum, fmtPct } from "@/lib/utils";

function hillCurve(k: number, s: number, nPoints = 60) {
  const maxX = k * 4;
  return Array.from({ length: nPoints }, (_, i) => {
    const x = (i / (nPoints - 1)) * maxX;
    const y = Math.pow(x, s) / (Math.pow(k, s) + Math.pow(x, s));
    return { x, y };
  });
}

interface Props {
  curve: SaturationCurve;
}

export function SaturationCurveChart({ curve }: Props) {
  if (!curve.k_param || !curve.s_param) {
    return (
      <div className="flex items-center justify-center h-[160px] text-gray-400 text-xs">
        Parámetros no disponibles
      </div>
    );
  }

  const data = hillCurve(curve.k_param, curve.s_param);

  // Operating point: sat_op is percentage (0-100). The x where Hill = sat_op/100
  // Hill(x) = sat_op/100 → x = K * (sat_op/(100-sat_op))^(1/S)
  const satFrac = (curve.sat_op ?? 50) / 100;
  const opX =
    satFrac > 0 && satFrac < 1
      ? curve.k_param * Math.pow(satFrac / (1 - satFrac), 1 / curve.s_param)
      : null;

  const maxX = data[data.length - 1]?.x ?? 1;

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis
          dataKey="x"
          type="number"
          domain={[0, maxX]}
          tick={{ fill: "#9ca3af", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => fmtNum(v)}
          tickCount={4}
        />
        <YAxis
          domain={[0, 1]}
          tick={{ fill: "#9ca3af", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => fmtPct(v * 100, 0)}
          tickCount={3}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: 11,
          }}
          formatter={(v) => [fmtPct((v as number) * 100, 1), "Sat."]}
          labelFormatter={(v) => `Gasto: ${fmtNum(v as number)}`}
        />
        <Line
          type="monotone"
          dataKey="y"
          stroke="#006729"
          strokeWidth={2}
          dot={false}
        />
        {opX != null && (
          <ReferenceLine
            x={opX}
            stroke="#E60018"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{
              value: `${fmtPct(curve.sat_op ?? 0, 0)}`,
              fill: "#E60018",
              fontSize: 10,
              position: "insideTopRight",
            }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
