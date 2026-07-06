import { createClient } from "@/lib/supabase/server";
import type { TimeSeriesRow, MonthlyScenario } from "@/lib/types";

export async function getTimeSeries(runId: string): Promise<TimeSeriesRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("time_series")
    .select("*")
    .eq("run_id", runId)
    .order("week_date");

  return data ?? [];
}

export async function getMonthlyScenarios(
  runId: string,
  year?: number
): Promise<MonthlyScenario[]> {
  const supabase = await createClient();
  let query = supabase
    .from("monthly_scenarios")
    .select("*")
    .eq("run_id", runId)
    .order("year")
    .order("month");

  if (year !== undefined) {
    query = query.eq("year", year);
  }

  const { data } = await query;
  return data ?? [];
}
