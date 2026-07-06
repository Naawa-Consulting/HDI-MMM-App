import { createClient } from "@/lib/supabase/server";
import type { OptimizationRun, OptimizationTotal, SaturationCurve, EconParams } from "@/lib/types";

export async function getOptimizationRuns(
  runId: string,
  year: number
): Promise<OptimizationRun[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("optimization_runs")
    .select("*")
    .eq("run_id", runId)
    .eq("opt_year", year)
    .order("is_modeled", { ascending: false });

  return data ?? [];
}

export async function getOptimizationTotals(
  runId: string,
  year: number
): Promise<OptimizationTotal | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("optimization_totals")
    .select("*")
    .eq("run_id", runId)
    .eq("opt_year", year)
    .single();

  return data ?? null;
}

export async function getSaturationCurves(runId: string): Promise<SaturationCurve[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saturation_curves")
    .select("*")
    .eq("run_id", runId);

  return data ?? [];
}

export async function getEconParams(runId: string): Promise<EconParams[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("econ_params")
    .select("*")
    .eq("run_id", runId)
    .order("year");

  return data ?? [];
}
