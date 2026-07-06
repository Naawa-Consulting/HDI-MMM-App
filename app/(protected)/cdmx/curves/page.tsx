import { getLatestRun } from "@/lib/queries/models";
import { getSaturationCurves } from "@/lib/queries/optimization";
import { SaturationCurveChart } from "@/components/charts/SaturationCurveChart";
import { fmtPct, fmtNum } from "@/lib/utils";

export const revalidate = 300;

export default async function CdmxCurvesPage() {
  const run = await getLatestRun("cdmx");
  if (!run) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-gray-500">Sin datos publicados para el modelo CDMX.</p>
      </div>
    );
  }

  const curves = await getSaturationCurves(run.id);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-gray-900 text-2xl font-semibold">Curvas de saturacion - CDMX</h1>
        <p className="text-gray-500 text-sm mt-1">Funcion Hill por canal: relacion entre gasto e impacto en cotizaciones</p>
      </div>

      {curves.length === 0 ? (
        <p className="text-gray-400">Sin curvas de saturacion disponibles.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {curves.map((c) => (
            <div key={c.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <p className="text-gray-900 font-semibold text-sm">{c.canal}</p>
                {c.sat_op != null && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.sat_op > 75 ? "bg-red-50 text-[#E60018]" : c.sat_op > 50 ? "bg-yellow-50 text-yellow-700" : "bg-green-50 text-[#006729]"
                  }`}>
                    {fmtPct(c.sat_op, 0)} saturado
                  </span>
                )}
              </div>
              <SaturationCurveChart curve={c} />
              <details className="mt-3 group">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 list-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform inline-block">&#8250;</span>
                  Parametros tecnicos
                </summary>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-400">Decay</p><p className="text-gray-700 font-medium">{c.decay != null ? c.decay.toFixed(2) : "—"}</p></div>
                  <div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-400">Half-life</p><p className="text-gray-700 font-medium">{c.half_life != null ? `${c.half_life.toFixed(1)} sem.` : "—"}</p></div>
                  <div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-400">Lag</p><p className="text-gray-700 font-medium">{c.lag_weeks != null ? `${c.lag_weeks} sem.` : "—"}</p></div>
                  <div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-400">K (50%)</p><p className="text-gray-700 font-medium">{c.k_param != null ? fmtNum(c.k_param) : "—"}</p></div>
                  <div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-400">S (slope)</p><p className="text-gray-700 font-medium">{c.s_param != null ? c.s_param.toFixed(2) : "—"}</p></div>
                  <div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-400">Beta</p><p className="text-gray-700 font-medium">{c.beta != null ? c.beta.toFixed(4) : "—"}</p></div>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
