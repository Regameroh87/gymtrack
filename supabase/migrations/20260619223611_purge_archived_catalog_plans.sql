-- Limpieza de planes de catálogo archivados. Complementa archive_catalog_plan /
-- delete_catalog_plan (20260619120000):
--   · restore_catalog_plan         → desarchivar (deshacer un archive).
--   · list_archived_catalog_plans  → listar archivados + conteo de seguidores activos (UI admin).
--   · purge_archived_catalog_plans → borrado físico de archivados viejos sin seguidores (cron).
-- Ver [[project_catalog_plan_archive]].

-- ── 1. Restaurar (desarchivar) ───────────────────────────────────────────────
create or replace function public.restore_catalog_plan(p_plan_id text)
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
    set archived_at = null, updated_at = now()
  where id = p_plan_id and is_catalog = true;

  if not found then
    raise exception 'plan % not found or not a catalog plan', p_plan_id;
  end if;
end;
$$;

-- ── 2. Listar archivados + seguidores activos ────────────────────────────────
create or replace function public.list_archived_catalog_plans()
returns table (
  id text,
  name text,
  objective text,
  level text,
  target_gender text,
  weekly_days integer,
  duration_weeks integer,
  cover_image_uri text,
  archived_at timestamptz,
  active_followers bigint
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_super_admin() then
    raise exception 'forbidden: super_admin required';
  end if;

  return query
  select
    tp.id, tp.name, tp.objective, tp.level, tp.target_gender,
    tp.weekly_days, tp.duration_weeks, tp.cover_image_uri, tp.archived_at,
    coalesce(cnt.n, 0) as active_followers
  from public.training_plans tp
  left join (
    select plan_id, count(*) as n
    from public.plan_assignments
    where status = 'active'
    group by plan_id
  ) cnt on cnt.plan_id = tp.id
  where tp.is_catalog = true and tp.archived_at is not null
  order by tp.archived_at desc;
end;
$$;

-- ── 3. Purga automática (cron): archivados > N días sin seguidores activos ────
-- NO se expone a authenticated: la corre el cron (rol owner), no un usuario.
create or replace function public.purge_archived_catalog_plans(p_older_than_days integer default 30)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_plan record;
  v_count integer := 0;
begin
  for v_plan in
    select tp.id
    from public.training_plans tp
    where tp.is_catalog = true
      and tp.archived_at is not null
      and tp.archived_at < now() - make_interval(days => p_older_than_days)
      and not exists (
        select 1 from public.plan_assignments pa
        where pa.plan_id = tp.id and pa.status = 'active'
      )
  loop
    delete from public.plan_week_day_exercise_sets where exercise_id in (
      select x.id from public.plan_week_day_exercises x
      join public.plan_week_days d on d.id = x.week_day_id
      join public.plan_weeks pw on pw.id = d.week_id
      where pw.plan_id = v_plan.id);
    delete from public.plan_week_day_exercises where week_day_id in (
      select d.id from public.plan_week_days d
      join public.plan_weeks pw on pw.id = d.week_id
      where pw.plan_id = v_plan.id);
    delete from public.plan_week_days where week_id in (
      select id from public.plan_weeks where plan_id = v_plan.id);
    delete from public.plan_weeks where plan_id = v_plan.id;
    delete from public.training_plans where id = v_plan.id and is_catalog = true;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ── 4. Cron diario (04:00 UTC) ───────────────────────────────────────────────
select cron.unschedule('purge-archived-catalog-plans')
where exists (select 1 from cron.job where jobname = 'purge-archived-catalog-plans');

select cron.schedule(
  'purge-archived-catalog-plans',
  '0 4 * * *',
  $cron$ select public.purge_archived_catalog_plans(30); $cron$
);

-- ── 5. Grants (purge queda fuera: solo cron/owner) ───────────────────────────
grant execute on function public.restore_catalog_plan(text)        to authenticated;
grant execute on function public.list_archived_catalog_plans()     to authenticated;
revoke execute on function public.purge_archived_catalog_plans(integer) from authenticated;
