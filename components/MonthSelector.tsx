"use client";

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

interface Props {
  availableMonths: number[]; // meses (1-12) con dato para el año activo
  selected: number[];        // [] = todos los meses
  onToggle: (month: number) => void;
  onSelectAll: () => void;
  enabled: boolean;          // false cuando hay 0, 2+ años o "Todos" activo
}

export function MonthSelector({
  availableMonths, selected, onToggle, onSelectAll, enabled,
}: Props) {
  if (!enabled || availableMonths.length === 0) return null;

  const allSelected = selected.length === 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-gray-500 font-medium">Mes:</span>

      <button
        onClick={onSelectAll}
        className={[
          "text-xs px-2.5 py-1 rounded-full font-medium transition-colors",
          allSelected
            ? "bg-[#003960] text-white"
            : "bg-gray-100 text-gray-500 hover:bg-gray-200",
        ].join(" ")}
      >
        Todos
      </button>

      {availableMonths.map((m) => {
        const isActive = !allSelected && selected.includes(m);
        return (
          <button
            key={m}
            onClick={() => onToggle(m)}
            className={[
              "text-xs px-2.5 py-1 rounded-full font-medium transition-colors",
              isActive
                ? "bg-[#003960] text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200",
            ].join(" ")}
          >
            {MONTH_LABELS[m - 1]}
          </button>
        );
      })}
    </div>
  );
}
