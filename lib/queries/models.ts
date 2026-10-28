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
// Historial de versiones para Salud del Modelo: el run vigente (is_published) y
// los anteriores a él, por scope. Solo hay un run publicado por scope, así que
// filtrar por is_published dejaba el historial con una sola fila y sin tendencia.
// Los borradores posteriores al vigente (aún en QA) no se muestran.
export async function getAllRunsBothScopes(): Promise<ModelRun[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("model_runs")
    .select("*")
    .order("run_date", { ascending: false });

  const runs = (data ?? []) as ModelRun[];
  const current = new Map(
    runs.filter((r) => r.is_published).map((r) => [r.model_scope, r.run_date] as const)
  );
  return runs.filter((r) => {
    const cur = current.get(r.model_scope);
    return cur != null && r.run_date <= cur;
  });
}
