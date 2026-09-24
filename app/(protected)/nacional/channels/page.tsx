import { getLatestRun } from "@/lib/queries/models";
import { getChannels, getRoiByYear, getHeatmapData, getChannelMonthly } from "@/lib/queries/channels";
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

  const [channels, roi, heatmap, channelMonthly] = await Promise.all([
    getChannels(run.id),
    getRoiByYear(run.id),
    getHeatmapData(run.id),
    getChannelMonthly(run.id),
  ]);

  return (
    <ChannelShell
      scope="nacional"
      channels={channels}
      roi={roi}
      heatmap={heatmap}
      channelMonthly={channelMonthly}
    />
  );
}
