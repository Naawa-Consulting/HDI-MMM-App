import { cn } from "@/lib/utils";

interface MetricKPIProps {
  label: string;
  value: string;
  sublabel?: string;
  accent?: boolean;
  className?: string;
}

export function MetricKPI({
  label,
  value,
  sublabel,
  accent = false,
  className,
}: MetricKPIProps) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        accent
          ? "bg-[#006729]/8 border-[#006729]/20"
          : "bg-gray-50 border-gray-200",
        className
      )}
    >
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p
        className={cn(
          "text-xl font-semibold",
          accent ? "text-[#006729]" : "text-gray-900"
        )}
      >
        {value}
      </p>
      {sublabel && <p className="text-gray-400 text-xs mt-0.5">{sublabel}</p>}
    </div>
  );
}
