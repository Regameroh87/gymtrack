-- Borrado SEGURO de planes de catálogo: archivar (soft-delete) en vez de hard-delete.
--
-- Problema: delete_catalog_plan (20260618140000) hace un hard delete del árbol + la fila
-- training_plans sin chequear asignaciones activas. Un member que está siguiendo ese plan
-- queda con una asignación huérfana y la app rota (Mi Plan sin título, sin "día de hoy").
--
-- Solución: archive_catalog_plan marca training_plans.archived_at y CONSERVA el árbol, así
-- los seguidores actuales terminan el plan. El flag archived_at se filtra client-side en el
-- descubrimiento (catálogo web + Explorar mobile); RLS NO cambia (los archivados deben
-- seguir sincronizándose a quienes los siguen, vía la policy existente por is_catalog).
-- delete_catalog_plan queda como purga definitiva pero con guarda: rechaza si hay
-- asignaciones activas. Ver [[project_default_catalog]].

-- ── 1. Columna ──────────────────────────────────────────────────────────────
alter table public.training_plans add column if not exists archived_at timestamptz;

create index if not exists training_plans_archived_idx
  on public.training_plans (archived_at) where archived_at is not null;

-- ── 2. Archivar plan de catálogo (soft-delete, conserva el árbol) ─────────────
create or replace function public.archive_catalog_plan(p_plan_id text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_super_admin() then
    raise exception 'forbidden: super_admin required';
  end if;

  update public.training_plans
    set archived_at = now(), updated_at = now()
  where id = p_plan_id and is_catalog = true;

  if not found then
    raise exception 'plan % not found or not a catalog plan', p_plan_id;
  end if;
end;
$$;

-- ── 3. Hard delete con guarda: bloquear si hay seguidores activos ─────────────
create or replace function public.delete_catalog_plan(p_plan_id text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_super_admin() then
    raise exception 'forbidden: super_admin required';
  end if;

  if exists (
    select 1 from public.plan_assignments
    where plan_id = p_plan_id and status = 'active'
  ) then
    raise exception 'plan % en uso por members activos: archivar en vez de borrar', p_plan_id;
  end if;

  delete from public.plan_week_day_exercise_sets where exercise_id in (
    select x.id from public.plan_week_day_exercises x
    join public.plan_week_days d on d.id = x.week_day_id
    join public.plan_weeks pw on pw.id = d.week_id
    where pw.plan_id = p_plan_id);
  delete from public.plan_week_day_exercises where week_day_id in (
    select d.id from public.plan_week_days d
    join public.plan_weeks pw on pw.id = d.week_id
    where pw.plan_id = p_plan_id);
  delete from public.plan_week_days where week_id in (
    select id from public.plan_weeks where plan_id = p_plan_id);
  delete from public.plan_weeks where plan_id = p_plan_id;
  delete from public.training_plans where id = p_plan_id and is_catalog = true;
end;
$$;

grant execute on function public.archive_catalog_plan(text) to authenticated;
grant execute on function public.delete_catalog_plan(text)  to authenticated;
