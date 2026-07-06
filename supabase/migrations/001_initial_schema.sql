-- ============================================================
-- HDI MMM App — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. model_runs
--    Central registry of every scoring or recalibration event.
--    All other tables FK here.
-- ────────────────────────────────────────────────────────────
create table public.model_runs (
  id            uuid          primary key default gen_random_uuid(),
  model_scope   text          not null check (model_scope in ('nacional', 'cdmx')),
  model_id      text          not null,
  run_type      text          not null check (run_type in ('scoring', 'recalibration')),
  data_through  date          not null,
  run_date      timestamptz   not null default now(),
  r2_adj        numeric(6,4),
  mape          numeric(6,4),
  rmse          numeric(8,3),
  n_obs         integer,
  attrib_mkt    numeric(6,4),
  attrib_base   numeric(6,4),
  notes         text,
  is_published  boolean       not null default false,
  created_by    text          not null default 'pipeline',
  created_at    timestamptz   not null default now()
);

comment on table public.model_runs is 'One row per scoring or recalibration run per model scope';
comment on column public.model_runs.is_published is 'Only published runs are shown in the app UI. Set manually via dashboard after QA.';

-- ────────────────────────────────────────────────────────────
-- 2. attribution_blocks
--    Three-block decomposition per run:
--    mercado_tendencia | estacionalidad | marketing
-- ────────────────────────────────────────────────────────────
create table public.attribution_blocks (
  id      uuid         primary key default gen_random_uuid(),
  run_id  uuid         not null references public.model_runs(id) on delete cascade,
  block   text         not null,
  pct     numeric(7,4) not null,
  unique (run_id, block)
);

-- ────────────────────────────────────────────────────────────
-- 3. channels
--    One row per channel per run (modeled and non-modeled).
-- ────────────────────────────────────────────────────────────
create table public.channels (
  id             uuid         primary key default gen_random_uuid(),
  run_id         uuid         not null references public.model_runs(id) on delete cascade,
  canal          text         not null,
  is_modeled     boolean      not null default true,
  inv            numeric(14,2),
  contrib_cot    numeric(12,4),
  contrib_pct    numeric(7,4),
  pol_atrib      numeric(12,4),
  prima_atrib    numeric(16,2),
  roas           numeric(10,4),
  cpa_cot        numeric(10,4),
  share_inv      numeric(7,4),
  share_contrib  numeric(7,4),
  gap            numeric(7,4),
  sat_op         numeric(6,2),
  marg           numeric(10,4),
  sort_order     integer      not null default 0,
  unique (run_id, canal)
);

-- ────────────────────────────────────────────────────────────
-- 4. roi_by_year
-- ────────────────────────────────────────────────────────────
create table public.roi_by_year (
  id          uuid         primary key default gen_random_uuid(),
  run_id      uuid         not null references public.model_runs(id) on delete cascade,
  year        smallint     not null,
  cot_obs     numeric(12,2),
  mkt_cot     numeric(12,4),
  attrib_pct  numeric(7,4),
  inv         numeric(14,2),
  roas        numeric(10,4),
  close_rate  numeric(6,4),
  prima_avg   numeric(10,2),
  is_partial  boolean      not null default false,
  unique (run_id, year)
);

-- ────────────────────────────────────────────────────────────
-- 5. saturation_curves
--    Hill + adstock parameters per channel per run.
-- ────────────────────────────────────────────────────────────
create table public.saturation_curves (
  id           uuid         primary key default gen_random_uuid(),
  run_id       uuid         not null references public.model_runs(id) on delete cascade,
  canal        text         not null,
  beta         numeric(14,6),
  k_param      numeric(14,4),
  s_param      numeric(8,4),
  decay        numeric(8,4),
  lag_weeks    smallint,
  half_life    numeric(8,4),
  sat_op       numeric(6,2),
  contrib_avg  numeric(12,4),
  pct_active   numeric(7,4),
  unique (run_id, canal)
);

-- ────────────────────────────────────────────────────────────
-- 6. time_series
--    Weekly model fit / decomposition. One row per week per run.
-- ────────────────────────────────────────────────────────────
create table public.time_series (
  id         uuid         primary key default gen_random_uuid(),
  run_id     uuid         not null references public.model_runs(id) on delete cascade,
  week_date  date         not null,
  obs        numeric(10,2),
  fitted     numeric(10,2),
  base       numeric(10,2),
  mkt        numeric(10,2),
  market     numeric(10,2),
  unique (run_id, week_date)
);

-- ────────────────────────────────────────────────────────────
-- 7. monthly_scenarios
--    Monthly summary for dashboard time-series panel.
-- ────────────────────────────────────────────────────────────
create table public.monthly_scenarios (
  id         uuid         primary key default gen_random_uuid(),
  run_id     uuid         not null references public.model_runs(id) on delete cascade,
  year       smallint     not null,
  month      smallint     not null check (month between 1 and 12),
  obs        numeric(10,2),
  base       numeric(10,2),
  mkt_act    numeric(10,2),
  mkt_plan   numeric(10,2),
  mkt_opt    numeric(10,2),
  unique (run_id, year, month)
);

-- ────────────────────────────────────────────────────────────
-- 8. optimization_runs
--    Budget optimization results — one row per channel per scenario.
-- ────────────────────────────────────────────────────────────
create table public.optimization_runs (
  id            uuid         primary key default gen_random_uuid(),
  run_id        uuid         not null references public.model_runs(id) on delete cascade,
  opt_year      smallint     not null,
  canal         text         not null,
  is_modeled    boolean      not null default true,
  ref_sp        numeric(14,2),
  opt_sp        numeric(14,2),
  ref_cot       numeric(12,4),
  opt_cot       numeric(12,4),
  uplift        numeric(8,4),
  ref_mix       numeric(7,4),
  opt_mix       numeric(7,4),
  sat_ref       numeric(6,2),
  marg          numeric(10,4),
  is_active     boolean      not null default true,
  unique (run_id, opt_year, canal)
);

-- ────────────────────────────────────────────────────────────
-- 9. optimization_totals
-- ────────────────────────────────────────────────────────────
create table public.optimization_totals (
  id           uuid         primary key default gen_random_uuid(),
  run_id       uuid         not null references public.model_runs(id) on delete cascade,
  opt_year     smallint     not null,
  budget_an    numeric(14,2),
  model_an     numeric(14,2),
  ref_cotiz    numeric(12,4),
  opt_cotiz    numeric(12,4),
  ref_pol      numeric(12,4),
  opt_pol      numeric(12,4),
  ref_prima    numeric(16,2),
  opt_prima    numeric(16,2),
  ref_roas     numeric(10,4),
  opt_roas     numeric(10,4),
  uplift_ratio numeric(8,4),
  unique (run_id, opt_year)
);

-- ────────────────────────────────────────────────────────────
-- 10. heatmap_data
--     Channel × year contribution % and ROAS (CDMX).
-- ────────────────────────────────────────────────────────────
create table public.heatmap_data (
  id           uuid         primary key default gen_random_uuid(),
  run_id       uuid         not null references public.model_runs(id) on delete cascade,
  canal        text         not null,
  year         smallint     not null,
  contrib_pct  numeric(7,4),
  roim         numeric(10,4),
  inv          numeric(14,2),
  unique (run_id, canal, year)
);

-- ────────────────────────────────────────────────────────────
-- 11. econ_params
--     Economic parameters (conversion rate, prima) per run/year.
-- ────────────────────────────────────────────────────────────
create table public.econ_params (
  id          uuid         primary key default gen_random_uuid(),
  run_id      uuid         not null references public.model_runs(id) on delete cascade,
  year        smallint     not null,
  close_rate  numeric(6,4),
  prima_avg   numeric(10,2),
  valor_cot   numeric(10,2),
  unique (run_id, year)
);

-- ============================================================
-- Row Level Security
-- All tables: authenticated users can SELECT.
-- No frontend writes — pipeline uses service_role key.
-- ============================================================

alter table public.model_runs          enable row level security;
alter table public.attribution_blocks  enable row level security;
alter table public.channels            enable row level security;
alter table public.roi_by_year         enable row level security;
alter table public.saturation_curves   enable row level security;
alter table public.time_series         enable row level security;
alter table public.monthly_scenarios   enable row level security;
alter table public.optimization_runs   enable row level security;
alter table public.optimization_totals enable row level security;
alter table public.heatmap_data        enable row level security;
alter table public.econ_params         enable row level security;

-- Single read policy per table
create policy "authenticated_read" on public.model_runs          for select using (auth.role() = 'authenticated');
create policy "authenticated_read" on public.attribution_blocks  for select using (auth.role() = 'authenticated');
create policy "authenticated_read" on public.channels            for select using (auth.role() = 'authenticated');
create policy "authenticated_read" on public.roi_by_year         for select using (auth.role() = 'authenticated');
create policy "authenticated_read" on public.saturation_curves   for select using (auth.role() = 'authenticated');
create policy "authenticated_read" on public.time_series         for select using (auth.role() = 'authenticated');
create policy "authenticated_read" on public.monthly_scenarios   for select using (auth.role() = 'authenticated');
create policy "authenticated_read" on public.optimization_runs   for select using (auth.role() = 'authenticated');
create policy "authenticated_read" on public.optimization_totals for select using (auth.role() = 'authenticated');
create policy "authenticated_read" on public.heatmap_data        for select using (auth.role() = 'authenticated');
create policy "authenticated_read" on public.econ_params         for select using (auth.role() = 'authenticated');

-- ============================================================
-- Indexes for common query patterns
-- ============================================================

-- Latest published run per scope (used on every page load)
create index idx_model_runs_scope_published
  on public.model_runs (model_scope, is_published, run_date desc);

-- Channel lookup by run
create index idx_channels_run_id on public.channels (run_id);

-- Time series by run + date range
create index idx_time_series_run_date on public.time_series (run_id, week_date);

-- Monthly scenarios by run + year
create index idx_monthly_scenarios_run_year on public.monthly_scenarios (run_id, year);

-- Optimization by run + year
create index idx_optimization_runs_run_year on public.optimization_runs (run_id, opt_year);
create index idx_optimization_totals_run_year on public.optimization_totals (run_id, opt_year);

-- Heatmap by run
create index idx_heatmap_run_id on public.heatmap_data (run_id);
