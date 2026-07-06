import { getLatestRun } from "@/lib/queries/models";
import { getOptimizationRuns, getOptimizationTotals } from "@/lib/queries/optimization";
import { OptimizationShell } from "@/components/OptimizationShell";

export const revalidate = 300;

interface Props {
  searchParams: Promise<{ year?: string }>;
}

export default async function NacionalOptimizationPage({ searchParams }: Props) {
  const params = await searchParams;
  const year   = parseInt(params.year ?? "2025");
  const run    = await getLatestRun("nacional");

  if (!run) {
    return (
      <div className="p-4 md:p-6">
        <p className="text-gray-500">Sin datos publicados para el modelo Nacional.</p>
      </div>
    );
  }

  const [runs, totals] = await Promise.all([
    getOptimizationRuns(run.id, year),
    getOptimizationTotals(run.id, year),
  ]);

  return <OptimizationShell scope="nacional" year={year} runs={runs} totals={totals} />;
}
