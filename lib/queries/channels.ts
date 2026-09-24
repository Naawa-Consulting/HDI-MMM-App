import { createClient } from "@/lib/supabase/server";
import type { Channel, AttributionBlock, RoiByYear, HeatmapData, ChannelMonthly } from "@/lib/types";

export async function getChannels(runId: string): Promise<Channel[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("channels")
    .select("*")
    .eq("run_id", runId)
    .order("sort_order");

  return data ?? [];
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

  return data ?? [];
}

export async function getHeatmapData(runId: string): Promise<HeatmapData[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("heatmap_data")
    .select("*")
    .eq("run_id", runId)
    .order("year");

  return data ?? [];
}

export async function getChannelMonthly(runId: string): Promise<ChannelMonthly[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("channel_monthly")
    .select("*")
    .eq("run_id", runId)
    .order("year")
    .order("month");

  return data ?? [];
}
