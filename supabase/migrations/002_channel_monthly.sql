-- ============================================================
-- HDI MMM App — channel_monthly
-- Run this in: Supabase Dashboard → SQL Editor
--
-- Etapa 2 del filtro por mes (2026-09-24): contribución/ROI por canal a
-- nivel mes, para el panel "Canales & ROI". Mismo criterio "exacto" que ya
-- usaba CDMX para su dato anual (descomposición semanal real, beta *
-- regresor transformado, NO la curva del optimizador) -- ver
-- outputs/presentations/compute_s22_optim.py / compute_cdmx.py.
--
-- Alcance: solo canales MODELADOS (los que ya tienen contrib_pct/roas real
-- en `channels`/`heatmap_data`). Los canales de referencia no-modelados
-- (Meta, Search/SEM, GDN, TV Azteca, PR-referencia en Nacional) se quedan
-- solo a nivel año (`channels`) -- no aportan contribución propia, y
-- replicar su inversión semanal a nivel mes no cambia nada actionable en
-- la vista de mes.
-- ============================================================

create table public.channel_monthly (
  id            uuid         primary key default gen_random_uuid(),
  run_id        uuid         not null references public.model_runs(id) on delete cascade,
  canal         text         not null,
  year          smallint     not null,
  month         smallint     not null check (month between 1 and 12),
  inv           numeric(14,2),
  contrib_cot   numeric(12,4),
  roas          numeric(10,4),
  unique (run_id, canal, year, month)
);

comment on table public.channel_monthly is
  'Contribución/ROI por canal MODELADO a nivel mes (descomposición semanal real agregada a mes, no la curva del optimizador). Complementa a heatmap_data (grano año) para el filtro de mes en Canales & ROI.';

alter table public.channel_monthly enable row level security;

create policy "authenticated_read" on public.channel_monthly for select using (auth.role() = 'authenticated');

create index idx_channel_monthly_run_year_month on public.channel_monthly (run_id, year, month);
