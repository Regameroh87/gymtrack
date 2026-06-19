-- Fix: las RPCs de autoría de catálogo (20260618130000) asumían ids `uuid`, pero todas
-- las tablas usan ids `text` (el cliente genera Crypto.randomUUID() como strings). Eso
-- rompía con "COALESCE could not convert type uuid[] to text[]" al crear sesiones/planes.
-- Acá se redefinen las 4 funciones tratando todos los ids como text. Los casts numéricos
-- (::int / ::real) se mantienen porque esas columnas sí son integer/real.
--
-- Cambian las firmas (save_* devuelven text; delete_* reciben text), así que se dropean
-- primero y se recrean.

drop function if exists public.save_catalog_session(jsonb);
drop function if exists public.save_catalog_plan(jsonb);
drop function if exists public.delete_catalog_plan(uuid);
drop function if exists public.delete_catalog_session(uuid);

-- ── Sesión de catálogo ───────────────────────────────────────────────────────
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
  if not public.is_super_admin() then
    raise exception 'forbidden: super_admin required';
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

-- ── Plan de catálogo ─────────────────────────────────────────────────────────
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
  if not public.is_super_admin() then
    raise exception 'forbidden: super_admin required';
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

-- ── Borrado de plan de catálogo (con árbol) ──────────────────────────────────
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

-- ── Borrado de sesión de catálogo (con session_exercises) ────────────────────
create or replace function public.delete_catalog_session(p_session_id text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_super_admin() then
    raise exception 'forbidden: super_admin required';
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

grant execute on function public.save_catalog_session(jsonb)   to authenticated;
grant execute on function public.save_catalog_plan(jsonb)      to authenticated;
grant execute on function public.delete_catalog_plan(text)     to authenticated;
grant execute on function public.delete_catalog_session(text)  to authenticated;
