import { getLatestRun } from "@/lib/queries/models";
import { getAttributionBlocks, getRoiByYear, getChannelMonthly } from "@/lib/queries/channels";
import { getMonthlyScenarios } from "@/lib/queries/timeseries";
import { AttributionShell } from "../../nacional/attribution/AttributionShell";

export const revalidate = 300;

export default async function CdmxAttributionPage() {
  const run = await getLatestRun("cdmx");
  if (!run) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-gray-500">Sin datos publicados para el modelo CDMX.</p>
      </div>
    );
  }

  const [blocks, monthly, roi, channelMonthly] = await Promise.all([
    getAttributionBlocks(run.id),
    getMonthlyScenarios(run.id),
    getRoiByYear(run.id),
    getChannelMonthly(run.id),
  ]);

  return (
    <AttributionShell
      run={run}
      blocks={blocks}
      roi={roi}
      monthly={monthly}
      channelMonthly={channelMonthly}
      scope="cdmx"
    />
  );
}
