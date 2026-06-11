-- RLS v2: los helpers pasan de leer profiles.gym_id/role a memberships.
-- El usuario ve datos de TODOS sus gyms vía RLS; el filtro por gym activo
-- es responsabilidad del cliente (incluido el pull del sync local).
-- Reemplazar el cuerpo de is_staff_of/is_admin_of/is_super_admin actualiza
-- de una vez todas las policies que ya los usaban.

-- super_admin ahora es flag global de la persona.
create or replace function public.is_super_admin()
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and is_super_admin
  );
$$;

-- Todos los gyms del usuario con membership activa.
create or replace function public.auth_gym_ids()
returns setof uuid
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select gym_id from public.memberships
  where user_id = auth.uid() and status = 'active';
$$;

create or replace function public.is_staff_of(g uuid)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.is_super_admin() or exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.gym_id = g
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'coach')
  );
$$;

create or replace function public.is_admin_of(g uuid)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.is_super_admin() or exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.gym_id = g
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  );
$$;

-- ¿El caller comparte algún gym activo con p_user? (para profiles_select;
-- DEFINER para que la RLS de memberships no recorte la subquery al caller)
create or replace function public.shares_gym_with(p_user uuid)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1
    from public.memberships a
    join public.memberships b on b.gym_id = a.gym_id
    where a.user_id = auth.uid()
      and b.user_id = p_user
      and a.status = 'active'
      and b.status = 'active'
  );
$$;

-- ¿p_user tiene membership en algún gym donde el caller es admin/owner?
create or replace function public.user_in_admin_gym(p_user uuid)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = p_user
      and m.status = 'active'
      and public.is_admin_of(m.gym_id)
  );
$$;

-- Pre-check de login global (reemplaza a email_exists_in_gym, que queda viva
-- hasta retirar los builds viejos).
create or replace function public.email_exists(p_email text)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.profiles
    where lower(email) = lower(p_email)
      and is_active = true
  );
$$;

-- ── Policies con auth_gym_id() o EXISTS inline sobre profiles ──────────────

-- gyms: el usuario ve todos sus gyms (necesario para el selector y el theme).
drop policy if exists gyms_select on public.gyms;
create policy gyms_select on public.gyms
  for select using (
    id in (select public.auth_gym_ids()) or public.is_super_admin()
  );

drop policy if exists exercises_base_select on public.exercises_base;
create policy exercises_base_select on public.exercises_base
  for select using (
    gym_id in (select public.auth_gym_ids()) or public.is_super_admin()
  );

drop policy if exists equipment_select on public.equipment;
create policy equipment_select on public.equipment
  for select using (
    gym_id in (select public.auth_gym_ids()) or public.is_super_admin()
  );

drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
  for select using (
    gym_id in (select public.auth_gym_ids()) or public.is_super_admin()
  );

drop policy if exists training_plans_select on public.training_plans;
create policy training_plans_select on public.training_plans
  for select using (
    gym_id in (select public.auth_gym_ids()) or public.is_super_admin()
  );

drop policy if exists exercise_equipment_select on public.exercise_equipment;
create policy exercise_equipment_select on public.exercise_equipment
  for select using (
    exists (
      select 1 from public.exercises_base e
      where e.id = exercise_equipment.exercise_id
        and (e.gym_id in (select public.auth_gym_ids()) or public.is_super_admin())
    )
  );

drop policy if exists session_exercises_select on public.session_exercises;
create policy session_exercises_select on public.session_exercises
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = session_exercises.session_id
        and (s.gym_id in (select public.auth_gym_ids()) or public.is_super_admin())
    )
  );

drop policy if exists plan_weeks_select on public.plan_weeks;
create policy plan_weeks_select on public.plan_weeks
  for select using (
    exists (
      select 1 from public.training_plans tp
      where tp.id = plan_weeks.plan_id
        and (tp.gym_id in (select public.auth_gym_ids()) or public.is_super_admin())
    )
  );

drop policy if exists plan_week_days_select on public.plan_week_days;
create policy plan_week_days_select on public.plan_week_days
  for select using (
    exists (
      select 1
      from public.plan_weeks pw
      join public.training_plans tp on tp.id = pw.plan_id
      where pw.id = plan_week_days.week_id
        and (tp.gym_id in (select public.auth_gym_ids()) or public.is_super_admin())
    )
  );

drop policy if exists plan_week_day_exercises_select on public.plan_week_day_exercises;
create policy plan_week_day_exercises_select on public.plan_week_day_exercises
  for select using (
    exists (
      select 1
      from public.plan_week_days d
      join public.plan_weeks pw on pw.id = d.week_id
      join public.training_plans tp on tp.id = pw.plan_id
      where d.id = plan_week_day_exercises.week_day_id
        and (tp.gym_id in (select public.auth_gym_ids()) or public.is_super_admin())
    )
  );

drop policy if exists plan_week_day_exercise_sets_select on public.plan_week_day_exercise_sets;
create policy plan_week_day_exercise_sets_select on public.plan_week_day_exercise_sets
  for select using (
    exists (
      select 1
      from public.plan_week_day_exercises x
      join public.plan_week_days d on d.id = x.week_day_id
      join public.plan_weeks pw on pw.id = d.week_id
      join public.training_plans tp on tp.id = pw.plan_id
      where x.id = plan_week_day_exercise_sets.exercise_id
        and (tp.gym_id in (select public.auth_gym_ids()) or public.is_super_admin())
    )
  );

-- attendances: member ve las suyas, staff las de sus gyms.
drop policy if exists "lectura asistencias" on public.attendances;
create policy attendances_select on public.attendances
  for select using (
    profile_id = public.auth_profile_id() or public.is_staff_of(gym_id)
  );

drop policy if exists "staff inserta asistencia manual" on public.attendances;
create policy attendances_staff_insert on public.attendances
  for insert with check (public.is_staff_of(gym_id));

drop policy if exists "staff gestiona tokens qr" on public.gym_qr_tokens;
create policy gym_qr_tokens_staff on public.gym_qr_tokens
  for all using (public.is_staff_of(gym_id))
  with check (public.is_staff_of(gym_id));

-- profiles: fila propia + gente que comparte algún gym (sin exponer super_admins).
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (
    user_id = auth.uid()
    or public.is_super_admin()
    or (public.shares_gym_with(user_id) and not is_super_admin)
  );

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all using (
    public.user_in_admin_gym(user_id) or public.is_admin_of(gym_id)
  )
  with check (
    public.user_in_admin_gym(user_id) or public.is_admin_of(gym_id)
  );

-- plan_assignments: member sus filas (user_id = profiles.id), staff por gym.
drop policy if exists "member ve sus asignaciones" on public.plan_assignments;
create policy plan_assignments_select on public.plan_assignments
  for select using (
    user_id = (public.auth_profile_id())::text or public.is_staff_of(gym_id)
  );

-- check_in_with_qr: la pertenencia al gym ahora se valida contra memberships.
create or replace function public.check_in_with_qr(p_token text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_gym_id     uuid;
  v_profile_id uuid;
  v_now        timestamptz := now();
  v_existing   uuid;
  v_new_id     uuid;
begin
  select gym_id into v_gym_id
  from gym_qr_tokens
  where token = p_token and expires_at > v_now;

  if v_gym_id is null then
    raise exception 'QR inválido o expirado';
  end if;

  select id into v_profile_id
  from profiles
  where user_id = auth.uid();

  if v_profile_id is null or not exists (
    select 1 from memberships
    where user_id = auth.uid()
      and gym_id = v_gym_id
      and status = 'active'
  ) then
    raise exception 'No pertenecés a este gimnasio';
  end if;

  -- Anti doble-check-in: ventana de 30 min
  select id into v_existing
  from attendances
  where profile_id = v_profile_id
    and gym_id = v_gym_id
    and checked_in_at > v_now - interval '30 minutes';

  if v_existing is not null then
    return json_build_object('status','already_checked_in','id',v_existing);
  end if;

  insert into attendances (gym_id, profile_id, method)
  values (v_gym_id, v_profile_id, 'qr')
  returning id into v_new_id;

  return json_build_object('status','ok','id',v_new_id);
end;
$$;
