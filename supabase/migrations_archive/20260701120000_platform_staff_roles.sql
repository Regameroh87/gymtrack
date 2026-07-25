-- ==========================================
-- 20260701120000_platform_staff_roles.sql
-- ==========================================
-- Roles de staff de plataforma: superadmin_admin / superadmin_coach.
--
-- Hoy super_admin es un flag global todo-o-nada (profiles.is_super_admin) usado
-- como bypass total en la mayoría de las policies. Esta migración agrega dos
-- niveles intermedios de staff de plataforma (admin/coach) que operan SOLO sobre
-- /platform, sin gym asociado (memberships.gym_id es NOT NULL, no pueden vivir
-- ahí). A diferencia de is_super_admin(), is_platform_admin()/is_platform_staff()
-- NO son un bypass general: solo se suman explícitamente a las policies/RPCs de
-- gyms y catálogo, y a la visibilidad de profiles entre staff de plataforma.
-- Todo lo que hoy depende de is_super_admin() a secas (p.ej. "entrar" a un gym
-- puntual) queda intacto: ni admin ni coach de plataforma heredan eso.

-- ── 1. Columna + constraint de integridad ──────────────────────────────────
alter table public.profiles
  add column platform_staff_role text
    check (platform_staff_role in ('admin', 'coach'));

alter table public.profiles
  add constraint profiles_platform_staff_role_super_admin_excl
  check (not is_super_admin or platform_staff_role is null);

-- ── 2. Helpers (mismo estilo que is_super_admin()) ─────────────────────────
create or replace function public.platform_staff_role()
returns text
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select platform_staff_role from public.profiles where user_id = auth.uid();
$$;

revoke execute on function public.platform_staff_role() from anon;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.is_super_admin() or public.platform_staff_role() = 'admin';
$$;

revoke execute on function public.is_platform_admin() from anon;

create or replace function public.is_platform_staff()
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.is_super_admin() or public.platform_staff_role() in ('admin', 'coach');
$$;

revoke execute on function public.is_platform_staff() from anon;

-- ── 3. gyms: admin-tier de plataforma puede gestionar gyms (no coach) ──────
-- is_platform_admin() ya incluye is_super_admin(), así que reemplaza (no suma)
-- la condición previa sin perder alcance.
drop policy if exists gyms_select on public.gyms;
create policy gyms_select on public.gyms
  for select using (
    public.is_platform_admin()
    or exists (
      select 1 from public.memberships m
      where m.gym_id = gyms.id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

drop policy if exists gyms_update on public.gyms;
create policy gyms_update on public.gyms
  for update using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ── 4. Catálogo: admin + coach de plataforma pueden gestionar contenido ────
drop policy if exists exercises_base_super_admin_all on public.exercises_base;
create policy exercises_base_super_admin_all on public.exercises_base
  for all using (public.is_platform_staff()) with check (public.is_platform_staff());

drop policy if exists sessions_super_admin_all on public.sessions;
create policy sessions_super_admin_all on public.sessions
  for all using (public.is_platform_staff()) with check (public.is_platform_staff());

drop policy if exists training_plans_super_admin_all on public.training_plans;
create policy training_plans_super_admin_all on public.training_plans
  for all using (public.is_platform_staff()) with check (public.is_platform_staff());

-- ── 5. profiles: staff de plataforma se ve entre sí (no expone gente de gyms) ──
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    user_id = auth.uid()
    or public.is_super_admin()
    or (public.shares_gym_with(user_id) and not is_super_admin)
    or (public.is_platform_staff() and (is_super_admin or platform_staff_role is not null))
  );

-- ── 6. RPCs de autoría de catálogo: mismo guard, is_super_admin() → is_platform_staff() ──
-- Se redefinen completas (CREATE OR REPLACE no permite parchear solo el guard);
-- el resto del cuerpo queda byte-a-byte igual a la versión vigente en
-- 20260629200000_squashed.sql.

create or replace function public.save_catalog_session(payload jsonb)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_session_id text;
  v_now        timestamptz := now();
  v_keep_ids   text[];
  v_removed    text[];
  v_ex         jsonb;
  v_idx        int := 0;
begin
  if not public.is_platform_staff() then
    raise exception 'forbidden: platform staff required';
  end if;

  v_session_id := nullif(payload->>'id', '');

  if v_session_id is null then
    v_session_id := gen_random_uuid()::text;
    insert into public.sessions
      (id, gym_id, name, description, level, cover_image_uri, is_catalog, created_at, updated_at)
    values
      (v_session_id, null, payload->>'name', nullif(payload->>'description', ''),
       nullif(payload->>'level', ''), nullif(payload->>'cover_image_uri', ''),
       true, v_now, v_now);
  else
    update public.sessions set
      name            = payload->>'name',
      description     = nullif(payload->>'description', ''),
      level           = nullif(payload->>'level', ''),
      cover_image_uri = nullif(payload->>'cover_image_uri', ''),
      updated_at      = v_now
    where id = v_session_id and is_catalog = true;
    if not found then
      raise exception 'session % not found or not a catalog session', v_session_id;
    end if;
  end if;

  -- IDs entrantes que ya existían
  select coalesce(array_agg(e->>'id'), '{}'::text[])
  into v_keep_ids
  from jsonb_array_elements(coalesce(payload->'exercises', '[]'::jsonb)) e
  where nullif(e->>'id', '') is not null;

  -- session_exercises a borrar (existían pero ya no están en el payload)
  select coalesce(array_agg(se.id), '{}'::text[])
  into v_removed
  from public.session_exercises se
  where se.session_id = v_session_id
    and se.id <> all(v_keep_ids);

  if array_length(v_removed, 1) is not null then
    delete from public.plan_week_day_exercise_sets
    where exercise_id in (
      select id from public.plan_week_day_exercises
      where session_exercise_id = any(v_removed)
    );
    delete from public.plan_week_day_exercises
    where session_exercise_id = any(v_removed);
    delete from public.session_exercises
    where id = any(v_removed);
  end if;

  -- Upsert de los entrantes, en orden
  for v_ex in
    select value from jsonb_array_elements(coalesce(payload->'exercises', '[]'::jsonb))
  loop
    if nullif(v_ex->>'id', '') is not null then
      update public.session_exercises
        set position = v_idx, exercise_id = v_ex->>'exercise_id'
      where id = v_ex->>'id';
    else
      insert into public.session_exercises (id, session_id, exercise_id, position)
      values (gen_random_uuid()::text, v_session_id, v_ex->>'exercise_id', v_idx);
    end if;
    v_idx := v_idx + 1;
  end loop;

  return v_session_id;
end;
$$;

create or replace function public.save_catalog_plan(payload jsonb)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_plan_id text;
  v_now     timestamptz := now();
  v_week    jsonb;
  v_day     jsonb;
  v_ex      jsonb;
  v_set     jsonb;
  v_week_id text;
  v_day_id  text;
  v_ex_id   text;
begin
  if not public.is_platform_staff() then
    raise exception 'forbidden: platform staff required';
  end if;

  v_plan_id := nullif(payload->>'id', '');

  if v_plan_id is null then
    v_plan_id := gen_random_uuid()::text;
    insert into public.training_plans
      (id, gym_id, name, description, objective, level, target_gender,
       weekly_days, duration_weeks, cover_image_uri, is_catalog, is_published,
       created_at, updated_at)
    values
      (v_plan_id, null, payload->>'name', nullif(payload->>'description', ''),
       nullif(payload->>'objective', ''), nullif(payload->>'level', ''),
       coalesce(nullif(payload->>'target_gender', ''), 'ambos'),
       coalesce((payload->>'weekly_days')::int, 3),
       coalesce((payload->>'duration_weeks')::int, 0),
       nullif(payload->>'cover_image_uri', ''),
       true, true, v_now, v_now);
  else
    update public.training_plans set
      name            = payload->>'name',
      description     = nullif(payload->>'description', ''),
      objective       = nullif(payload->>'objective', ''),
      level           = nullif(payload->>'level', ''),
      target_gender   = coalesce(nullif(payload->>'target_gender', ''), 'ambos'),
      weekly_days     = coalesce((payload->>'weekly_days')::int, 3),
      duration_weeks  = coalesce((payload->>'duration_weeks')::int, 0),
      cover_image_uri = nullif(payload->>'cover_image_uri', ''),
      updated_at      = v_now
    where id = v_plan_id and is_catalog = true;
    if not found then
      raise exception 'plan % not found or not a catalog plan', v_plan_id;
    end if;

    -- Borrar el árbol anterior completo
    delete from public.plan_week_day_exercise_sets where exercise_id in (
      select x.id from public.plan_week_day_exercises x
      join public.plan_week_days d on d.id = x.week_day_id
      join public.plan_weeks pw on pw.id = d.week_id
      where pw.plan_id = v_plan_id);
    delete from public.plan_week_day_exercises where week_day_id in (
      select d.id from public.plan_week_days d
      join public.plan_weeks pw on pw.id = d.week_id
      where pw.plan_id = v_plan_id);
    delete from public.plan_week_days where week_id in (
      select id from public.plan_weeks where plan_id = v_plan_id);
    delete from public.plan_weeks where plan_id = v_plan_id;
  end if;

  -- Reconstruir el árbol desde el payload
  for v_week in
    select value from jsonb_array_elements(coalesce(payload->'weeks', '[]'::jsonb))
  loop
    v_week_id := gen_random_uuid()::text;
    insert into public.plan_weeks (id, plan_id, week_number, created_at, updated_at)
    values (v_week_id, v_plan_id, (v_week->>'week_number')::int, v_now, v_now);

    for v_day in
      select value from jsonb_array_elements(coalesce(v_week->'days', '[]'::jsonb))
    loop
      continue when nullif(v_day->>'session_id', '') is null;

      v_day_id := gen_random_uuid()::text;
      insert into public.plan_week_days
        (id, week_id, day_number, session_id, created_at, updated_at)
      values
        (v_day_id, v_week_id, (v_day->>'day_number')::int,
         v_day->>'session_id', v_now, v_now);

      for v_ex in
        select value from jsonb_array_elements(coalesce(v_day->'exercises', '[]'::jsonb))
      loop
        v_ex_id := gen_random_uuid()::text;
        insert into public.plan_week_day_exercises
          (id, week_day_id, session_exercise_id, position, prescription_mode,
           rest_seconds, intensity_mode, tempo, notes, created_at, updated_at)
        values
          (v_ex_id, v_day_id, v_ex->>'session_exercise_id',
           coalesce((v_ex->>'position')::int, 0),
           coalesce(nullif(v_ex->>'prescription_mode', ''), 'reps'),
           coalesce((v_ex->>'rest_seconds')::int, 90),
           coalesce(nullif(v_ex->>'intensity_mode', ''), 'none'),
           nullif(v_ex->>'tempo', ''), nullif(v_ex->>'notes', ''),
           v_now, v_now);

        for v_set in
          select value from jsonb_array_elements(coalesce(v_ex->'sets', '[]'::jsonb))
        loop
          insert into public.plan_week_day_exercise_sets
            (id, exercise_id, set_number, reps_min, reps_max, weight_kg,
             duration_seconds, rir, rpe, created_at, updated_at)
          values
            (gen_random_uuid()::text, v_ex_id, (v_set->>'set_number')::int,
             (v_set->>'reps_min')::int, (v_set->>'reps_max')::int,
             (v_set->>'weight_kg')::real, (v_set->>'duration_seconds')::int,
             (v_set->>'rir')::real, (v_set->>'rpe')::real, v_now, v_now);
        end loop;
      end loop;
    end loop;
  end loop;

  return v_plan_id;
end;
$$;

create or replace function public.delete_catalog_session(p_session_id text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_platform_staff() then
    raise exception 'forbidden: platform staff required';
  end if;

  delete from public.plan_week_day_exercise_sets where exercise_id in (
    select id from public.plan_week_day_exercises where session_exercise_id in (
      select id from public.session_exercises where session_id = p_session_id));
  delete from public.plan_week_day_exercises where session_exercise_id in (
    select id from public.session_exercises where session_id = p_session_id);
  delete from public.plan_week_days where session_id = p_session_id;
  delete from public.session_exercises where session_id = p_session_id;
  delete from public.sessions where id = p_session_id and is_catalog = true;
end;
$$;

create or replace function public.archive_catalog_plan(p_plan_id text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_platform_staff() then
    raise exception 'forbidden: platform staff required';
  end if;

  update public.training_plans
    set archived_at = now(), updated_at = now()
  where id = p_plan_id and is_catalog = true;

  if not found then
    raise exception 'plan % not found or not a catalog plan', p_plan_id;
  end if;
end;
$$;

create or replace function public.delete_catalog_plan(p_plan_id text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_platform_staff() then
    raise exception 'forbidden: platform staff required';
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

create or replace function public.restore_catalog_plan(p_plan_id text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_platform_staff() then
    raise exception 'forbidden: platform staff required';
  end if;

  update public.training_plans
    set archived_at = null, updated_at = now()
  where id = p_plan_id and is_catalog = true;

  if not found then
    raise exception 'plan % not found or not a catalog plan', p_plan_id;
  end if;
end;
$$;

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
  if not public.is_platform_staff() then
    raise exception 'forbidden: platform staff required';
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
