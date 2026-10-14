import { createClient } from "@/lib/supabase/server";
import { applyMargin } from "@/lib/margin";
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

  if (!data) return null;
  const t = data as OptimizationTotal;
  // ref/opt_roas guardados = brutos; se ajustan con el margen del año de optimización.
  return {
    ...t,
    ref_roas: applyMargin(t.ref_roas, t.opt_year),
    opt_roas: applyMargin(t.opt_roas, t.opt_year),
  };
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
