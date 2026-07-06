import { getLatestRun } from "@/lib/queries/models";
import { getAttributionBlocks } from "@/lib/queries/channels";
import { getTimeSeries } from "@/lib/queries/timeseries";
import { MetricKPI } from "@/components/MetricKPI";
import { ModelOverviewChart } from "./ModelOverviewChart";
import { fmtPct, fmtNum, RUN_TYPE_LABELS } from "@/lib/utils";

export const revalidate = 300;

export default async function NacionalPage() {
  const run = await getLatestRun("nacional");
  if (!run) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-gray-500">Sin datos publicados para el modelo Nacional.</p>
      </div>
    );
  }

  const [blocks, series] = await Promise.all([
    getAttributionBlocks(run.id),
    getTimeSeries(run.id),
  ]);

  const mktBlock = blocks.find((b) => b.block === "marketing");
  const mktPct = mktBlock?.pct ?? run.attrib_mkt;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-gray-900 text-2xl font-semibold">Modelo Nacional</h1>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
            {RUN_TYPE_LABELS[run.run_type] ?? run.run_type}
          </span>
        </div>
        <p className="text-gray-500 text-sm mt-1">
          {run.model_id} — datos al {formatDate(run.data_through)}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <MetricKPI label="R² ajustado" value={run.r2_adj != null ? run.r2_adj.toFixed(3) : "—"} />
        <MetricKPI label="MAPE" value={run.mape != null ? fmtPct(run.mape, 1) : "—"} />
        <MetricKPI label="RMSE" value={run.rmse != null ? fmtNum(run.rmse, 0) : "—"} />
        <MetricKPI label="Semanas" value={run.n_obs != null ? String(run.n_obs) : "—"} />
        <MetricKPI label="Atrib. Marketing" value={mktPct != null ? fmtPct(mktPct, 1) : "—"} accent />
      </div>

      {mktPct != null && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
          <h3 className="text-gray-900 font-semibold mb-4">Atribucion total del periodo</h3>
          <div className="space-y-2">
            {blocks.map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <span className="text-gray-500 text-xs w-32 text-right capitalize">
                  {b.block}
                </span>
                <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(0, Math.min(100, b.pct))}%`,
                      backgroundColor: b.block === "marketing" ? "#65A518" : "#003960",
                      opacity: b.block === "marketing" ? 1 : 0.4 + blocks.indexOf(b) * 0.1,
                    }}
                  />
                </div>
                <span className="text-gray-700 text-xs font-medium w-12">
                  {fmtPct(b.pct, 1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-gray-900 font-semibold">Ajuste del modelo</h3>
          <p className="text-gray-500 text-xs mt-0.5">Cotizaciones observadas vs ajustadas</p>
        </div>
        <ModelOverviewChart series={series} />
      </div>
    </div>
  );
}
