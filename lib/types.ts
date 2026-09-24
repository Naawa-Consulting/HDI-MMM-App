// ─────────────────────────────────────────────────────────────────────────────
// Database types — mirrors the Supabase schema in 001_initial_schema.sql
// Run `npx supabase gen types typescript --project-id <ref>` to regenerate
// from the live schema once the Supabase project is created.
// ─────────────────────────────────────────────────────────────────────────────

export type ModelScope = "nacional" | "cdmx";
export type RunType = "scoring" | "recalibration";

export interface ModelRun {
  id: string;
  model_scope: ModelScope;
  model_id: string;
  run_type: RunType;
  data_through: string; // ISO date
  run_date: string;     // ISO timestamp
  r2: number | null;
  r2_adj: number | null;
  mape: number | null;
  rmse: number | null;
  n_obs: number | null;
  attrib_mkt: number | null;
  attrib_base: number | null;
  durbin_watson: number | null;
  max_vif: number | null;
  notes: string | null;
  is_published: boolean;
  created_by: string;
  created_at: string;
}

export interface AttributionBlock {
  id: string;
  run_id: string;
  block: string;
  pct: number;
}

export interface Channel {
  id: string;
  run_id: string;
  canal: string;
  is_modeled: boolean;
  inv: number | null;
  contrib_cot: number | null;
  contrib_pct: number | null;
  pol_atrib: number | null;
  prima_atrib: number | null;
  roas: number | null;
  cpa_cot: number | null;
  share_inv: number | null;
  share_contrib: number | null;
  gap: number | null;
  sat_op: number | null;
  marg: number | null;
  sort_order: number;
}

export interface RoiByYear {
  id: string;
  run_id: string;
  year: number;
  cot_obs: number | null;
  mkt_cot: number | null;
  attrib_pct: number | null;
  inv: number | null;
  roas: number | null;
  close_rate: number | null;
  prima_avg: number | null;
  is_partial: boolean;
}

export interface SaturationCurve {
  id: string;
  run_id: string;
  canal: string;
  beta: number | null;
  k_param: number | null;
  s_param: number | null;
  decay: number | null;
  lag_weeks: number | null;
  half_life: number | null;
  sat_op: number | null;
  contrib_avg: number | null;
  pct_active: number | null;
}

export interface TimeSeriesRow {
  id: string;
  run_id: string;
  week_date: string;
  obs: number | null;
  fitted: number | null;
  base: number | null;
  mkt: number | null;
  market: number | null;
}

export interface MonthlyScenario {
  id: string;
  run_id: string;
  year: number;
  month: number;
  obs: number | null;
  base: number | null;
  agentes: number | null;
  estac: number | null;
  mkt_act: number | null;
  mkt_plan: number | null;
  mkt_opt: number | null;
}

export interface OptimizationRun {
  id: string;
  run_id: string;
  opt_year: number;
  canal: string;
  is_modeled: boolean;
  ref_sp: number | null;
  opt_sp: number | null;
  ref_cot: number | null;
  opt_cot: number | null;
  uplift: number | null;
  ref_mix: number | null;
  opt_mix: number | null;
  sat_ref: number | null;
  marg: number | null;
  is_active: boolean;
}

export interface OptimizationTotal {
  id: string;
  run_id: string;
  opt_year: number;
  budget_an: number | null;
  model_an: number | null;
  ref_cotiz: number | null;
  opt_cotiz: number | null;
  ref_pol: number | null;
  opt_pol: number | null;
  ref_prima: number | null;
  opt_prima: number | null;
  ref_roas: number | null;
  opt_roas: number | null;
  uplift_ratio: number | null;
}

export interface ChannelMonthly {
  id: string;
  run_id: string;
  canal: string;
  year: number;
  month: number;
  inv: number | null;
  contrib_cot: number | null;
  roas: number | null;
}

export interface HeatmapData {
  id: string;
  run_id: string;
  canal: string;
  year: number;
  contrib_pct: number | null;
  roim: number | null;
  inv: number | null;
  sat_op: number | null;
}

export interface EconParams {
  id: string;
  run_id: string;
  year: number;
  close_rate: number | null;
  prima_avg: number | null;
  valor_cot: number | null;
}

// Supabase Database type wrapper (for typed client)
export interface Database {
  public: {
    Tables: {
      model_runs:          { Row: ModelRun };
      attribution_blocks:  { Row: AttributionBlock };
      channels:            { Row: Channel };
      roi_by_year:         { Row: RoiByYear };
      saturation_curves:   { Row: SaturationCurve };
      time_series:         { Row: TimeSeriesRow };
      monthly_scenarios:   { Row: MonthlyScenario };
      optimization_runs:   { Row: OptimizationRun };
      optimization_totals: { Row: OptimizationTotal };
      heatmap_data:        { Row: HeatmapData };
      channel_monthly:     { Row: ChannelMonthly };
      econ_params:         { Row: EconParams };
    };
  };
}
