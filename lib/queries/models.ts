import { createClient } from "@/lib/supabase/server";
import type { ModelRun, ModelScope } from "@/lib/types";

/** Latest published run per scope. */
export async function getLatestRun(scope: ModelScope): Promise<ModelRun | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("model_runs")
    .select("*")
    .eq("model_scope", scope)
    .eq("is_published", true)
    .order("run_date", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

/** All published runs for a scope, newest first. */
export async function getAllRuns(scope: ModelScope): Promise<ModelRun[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("model_runs")
    .select("*")
    .eq("model_scope", scope)
    .eq("is_published", true)
    .order("run_date", { ascending: false });

  return data ?? [];
}

/** All published runs for both scopes — used in /model-health. */
export async function getAllRunsBothScopes(): Promise<ModelRun[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("model_runs")
    .select("*")
    .eq("is_published", true)
    .order("run_date", { ascending: false });

  return data ?? [];
}
