import { createClient } from "@/lib/supabase/server";
import { applyMargin, CHANNELS_SNAPSHOT_YEAR } from "@/lib/margin";
import type { Channel, AttributionBlock, RoiByYear, HeatmapData, ChannelMonthly } from "@/lib/types";

export async function getChannels(runId: string): Promise<Channel[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("channels")
    .select("*")
    .eq("run_id", runId)
    .order("sort_order");

  // La tabla `channels` es una foto de un solo año (2025, ver push_nacional.py).
  return ((data ?? []) as Channel[]).map((c) => ({ ...c, roas: applyMargin(c.roas, CHANNELS_SNAPSHOT_YEAR) }));
}

export async function getAttributionBlocks(runId: string): Promise<AttributionBlock[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attribution_blocks")
    .select("*")
    .eq("run_id", runId);

  return data ?? [];
}

export async function getRoiByYear(runId: string): Promise<RoiByYear[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("roi_by_year")
    .select("*")
    .eq("run_id", runId)
    .order("year");

  // roas guardado = bruto (prima / inversión); la UI recibe el ajustado por margen.
  return ((data ?? []) as RoiByYear[]).map((r) => ({ ...r, roas: applyMargin(r.roas, r.year) }));
}

export async function getHeatmapData(runId: string): Promise<HeatmapData[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("heatmap_data")
    .select("*")
    .eq("run_id", runId)
    .order("year");

  return ((data ?? []) as HeatmapData[]).map((h) => ({ ...h, roim: applyMargin(h.roim, h.year) }));
}

export async function getChannelMonthly(runId: string): Promise<ChannelMonthly[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("channel_monthly")
    .select("*")
    .eq("run_id", runId)
    .order("year")
    .order("month");

  return ((data ?? []) as ChannelMonthly[]).map((r) => ({ ...r, roas: applyMargin(r.roas, r.year) }));
}
