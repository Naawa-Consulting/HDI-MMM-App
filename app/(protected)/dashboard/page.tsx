import { getLatestRun } from "@/lib/queries/models";
import {
  getAttributionBlocks,
  getChannels,
  getRoiByYear,
  getHeatmapData,
} from "@/lib/queries/channels";
import { getMonthlyScenarios } from "@/lib/queries/timeseries";
import { DashboardShell } from "./DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [runNacional, runCdmx] = await Promise.all([
    getLatestRun("nacional"),
    getLatestRun("cdmx"),
  ]);

  const [
    blocksNacional,
    blocksCdmx,
    channelsNacional,
    channelsCdmx,
    roiNacional,
    roiCdmx,
    heatmapNacional,
    heatmapCdmx,
    monthlyNacional,
    monthlyCdmx,
  ] = await Promise.all([
    runNacional ? getAttributionBlocks(runNacional.id) : Promise.resolve([]),
    runCdmx ? getAttributionBlocks(runCdmx.id) : Promise.resolve([]),
    runNacional ? getChannels(runNacional.id) : Promise.resolve([]),
    runCdmx ? getChannels(runCdmx.id) : Promise.resolve([]),
    runNacional ? getRoiByYear(runNacional.id) : Promise.resolve([]),
    runCdmx ? getRoiByYear(runCdmx.id) : Promise.resolve([]),
    runNacional ? getHeatmapData(runNacional.id) : Promise.resolve([]),
    runCdmx ? getHeatmapData(runCdmx.id) : Promise.resolve([]),
    runNacional ? getMonthlyScenarios(runNacional.id) : Promise.resolve([]),
    runCdmx ? getMonthlyScenarios(runCdmx.id) : Promise.resolve([]),
  ]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-gray-900 text-2xl font-semibold">
          Resumen Ejecutivo
        </h1>
      </div>

      <DashboardShell
        runNacional={runNacional}
        runCdmx={runCdmx}
        blocksNacional={blocksNacional}
        blocksCdmx={blocksCdmx}
        channelsNacional={channelsNacional}
        channelsCdmx={channelsCdmx}
        roiNacional={roiNacional}
        roiCdmx={roiCdmx}
        heatmapNacional={heatmapNacional}
        heatmapCdmx={heatmapCdmx}
        monthlyNacional={monthlyNacional}
        monthlyCdmx={monthlyCdmx}
      />
    </div>
  );
}
