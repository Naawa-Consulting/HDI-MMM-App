"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";
import type { Channel } from "@/lib/types";
import { fmtPct } from "@/lib/utils";

interface Props {
  channels: Channel[];
}

export function ChannelBarChart({ channels }: Props) {
  const data = channels
    .filter((c) => c.is_modeled && c.share_inv != null)
    .map((c) => ({
      canal: c.canal,
      "Share de Inversion": Math.round((c.share_inv ?? 0) * 10) / 10,
      "Share de Contribucion": Math.round((c.share_contrib ?? 0) * 10) / 10,
    }))
    .sort((a, b) => b["Share de Contribucion"] - a["Share de Contribucion"]);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[240px] text-gray-400 text-sm">
        Sin datos
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 48, left: 80, bottom: 4 }}
        barCategoryGap="30%"
        barGap={2}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <YAxis
          type="category"
          dataKey="canal"
          tick={{ fill: "#374151", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={76}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: 12,
          }}
          formatter={(v, name) => [`${v}%`, name]}
        />
        <Legend
          iconType="square"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: "#6b7280" }}
        />
        <Bar dataKey="Share de Inversion" fill="#d1d5db" radius={[0, 2, 2, 0]}>
          <LabelList
            dataKey="Share de Inversion"
            position="right"
            formatter={(v) => `${v}%`}
            style={{ fill: "#9ca3af", fontSize: 11 }}
          />
        </Bar>
        <Bar dataKey="Share de Contribucion" fill="#65A518" radius={[0, 2, 2, 0]}>
          <LabelList
            dataKey="Share de Contribucion"
            position="right"
            formatter={(v) => `${v}%`}
            style={{ fill: "#65A518", fontSize: 11, fontWeight: 500 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
