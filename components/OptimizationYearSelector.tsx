"use client";

import { useRouter, usePathname } from "next/navigation";

interface Props {
  current: number;
}

export function OptimizationYearSelector({ current }: Props) {
  const router   = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex rounded-lg bg-gray-100 border border-gray-200 overflow-hidden text-xs">
      {[2025, 2026].map((y) => (
        <button
          key={y}
          onClick={() => router.push(`${pathname}?year=${y}`)}
          className={`px-4 py-2 font-medium transition-colors ${
            current === y
              ? "bg-[#006729] text-white"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {y}
        </button>
      ))}
    </div>
  );
}
