import { getLatestRun } from "@/lib/queries/models";
import { getChannels, getRoiByYear, getHeatmapData, getChannelMonthly } from "@/lib/queries/channels";
import { getMonthlyScenarios } from "@/lib/queries/timeseries";
import { ChannelShell } from "@/components/ChannelShell";

export const revalidate = 300;

export default async function NacionalChannelsPage() {
  const run = await getLatestRun("nacional");
  if (!run) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-gray-500">Sin datos publicados para el modelo Nacional.</p>
      </div>
    );
  }

  const [channels, roi, heatmap, channelMonthly, monthly] = await Promise.all([
    getChannels(run.id),
    getRoiByYear(run.id),
    getHeatmapData(run.id),
    getChannelMonthly(run.id),
    getMonthlyScenarios(run.id),
  ]);

  return (
    <ChannelShell
      scope="nacional"
      channels={channels}
      roi={roi}
      heatmap={heatmap}
      channelMonthly={channelMonthly}
      monthly={monthly}
    />
  );
}
