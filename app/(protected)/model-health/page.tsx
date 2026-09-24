import { getAllRunsBothScopes, getLatestRun } from "@/lib/queries/models";
import { getTimeSeries } from "@/lib/queries/timeseries";
import { ModelHealthSparklines } from "./ModelHealthSparklines";
import { ActualVsModelChart } from "@/components/charts/ActualVsModelChart";
import { fmtPct, RUN_TYPE_LABELS } from "@/lib/utils";

export const revalidate = 60;

export default async function ModelHealthPage() {
  const [runs, nacRun, cdmxRun] = await Promise.all([
    getAllRunsBothScopes(),
    getLatestRun("nacional"),
    getLatestRun("cdmx"),
  ]);

  const [nacTs, cdmxTs] = await Promise.all([
    nacRun ? getTimeSeries(nacRun.id) : Promise.resolve([]),
    cdmxRun ? getTimeSeries(cdmxRun.id) : Promise.resolve([]),
  ]);

  const nacional = runs.filter((r) => r.model_scope === "nacional");
  const cdmx = runs.filter((r) => r.model_scope === "cdmx");

  // timeZone:"UTC" obligatorio -- iso aquí es `data_through`, un `date` sin
  // hora; sin esto, en husos detrás de UTC el día se corre uno hacia atrás.
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  // formatDateTime SÍ usa la zona local (por diseño): run_date es un
  // timestamp real (instante), no una fecha de calendario.
  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-gray-900 text-2xl font-semibold">Salud del Modelo</h1>
        <p className="text-gray-500 text-sm mt-1">Historial de versiones publicadas y tendencia de metricas</p>
      </div>

      {/* Actual vs Model fit charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-gray-900 font-semibold mb-1">Observado vs Ajuste - Nacional</h3>
          <p className="text-gray-500 text-xs mb-3">
            Cotizaciones semanales observadas vs ajuste del modelo (linea punteada)
          </p>
          <ActualVsModelChart data={nacTs} color="#006729" />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-gray-900 font-semibold mb-1">Observado vs Ajuste - CDMX</h3>
          <p className="text-gray-500 text-xs mb-3">
            Cotizaciones semanales observadas vs ajuste del modelo (linea punteada)
          </p>
          <ActualVsModelChart data={cdmxTs} color="#00A3A8" />
        </div>
      </div>

      {/* Attribution trend sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-gray-900 font-semibold mb-1">Atribucion Marketing - Nacional</h3>
          <p className="text-gray-500 text-xs mb-3">Banda +/-3pp indica umbral de re-entrenamiento</p>
          <ModelHealthSparklines runs={nacional} color="#006729" />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-gray-900 font-semibold mb-1">Atribucion Marketing - CDMX</h3>
          <p className="text-gray-500 text-xs mb-3">Banda +/-3pp indica umbral de re-entrenamiento</p>
          <ModelHealthSparklines runs={cdmx} color="#00A3A8" />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm overflow-auto">
        <h3 className="text-gray-900 font-semibold mb-4">Historial de versiones</h3>
        {runs.length === 0 ? (
          <p className="text-gray-400 text-sm">Sin runs publicados.</p>
        ) : (
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Scope</th>
                <th className="text-left pb-2 font-medium">Modelo</th>
                <th className="text-left pb-2 font-medium">Tipo</th>
                <th className="text-right pb-2 font-medium">Datos hasta</th>
                <th className="text-right pb-2 font-medium">R²</th>
                <th className="text-right pb-2 font-medium">R²adj</th>
                <th className="text-right pb-2 font-medium">MAPE</th>
                <th className="text-right pb-2 font-medium">Durbin-Watson</th>
                <th className="text-right pb-2 font-medium">Max VIF</th>
                <th className="text-right pb-2 font-medium">Publicado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {runs.map((r) => (
                <tr key={r.id} className="text-gray-900 hover:bg-gray-50">
                  <td className="py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.model_scope === "nacional" ? "bg-[#006729]/10 text-[#006729]" : "bg-[#00A3A8]/10 text-[#00A3A8]"
                    }`}>
                      {r.model_scope === "nacional" ? "Nacional" : "CDMX"}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono text-xs text-gray-600">{r.model_id}</td>
                  <td className="py-2.5 text-gray-600">{RUN_TYPE_LABELS[r.run_type] ?? r.run_type}</td>
                  <td className="py-2.5 text-right text-gray-600">{formatDate(r.data_through)}</td>
                  <td className="py-2.5 text-right">{r.r2 != null ? r.r2.toFixed(3) : "—"}</td>
                  <td className="py-2.5 text-right">{r.r2_adj != null ? r.r2_adj.toFixed(3) : "—"}</td>
                  <td className="py-2.5 text-right">{r.mape != null ? fmtPct(r.mape, 1) : "—"}</td>
                  <td className="py-2.5 text-right">{r.durbin_watson != null ? r.durbin_watson.toFixed(2) : "—"}</td>
                  <td className="py-2.5 text-right">{r.max_vif != null ? r.max_vif.toFixed(1) : "—"}</td>
                  <td className="py-2.5 text-right text-gray-500 text-xs">{formatDateTime(r.run_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
