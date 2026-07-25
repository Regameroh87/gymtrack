-- ==========================================
-- 20260611120000_memberships.sql
-- ==========================================
-- Multi-gym: una persona puede pertenecer a varios gyms con roles distintos.
-- memberships es el vínculo persona↔gym; profiles queda como identidad global.
-- Durante la transición profiles.gym_id/role se mantienen poblados por trigger
-- para que los builds viejos (EXPO_PUBLIC_GYM_ID) sigan funcionando.

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gym_id uuid not null references public.gyms(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner','admin','coach','member')),
  status text not null default 'active'
    check (status in ('active','inactive')),
  added_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, gym_id)
);

create index memberships_user_id_idx on public.memberships (user_id);
create index memberships_gym_id_idx on public.memberships (gym_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger memberships_set_updated_at
  before update on public.memberships
  for each row execute function public.set_updated_at();

-- super_admin pasa a ser un flag global de la persona; memberships.role solo
-- contiene roles por gym (owner/admin/coach/member).
alter table public.profiles
  add column is_super_admin boolean not null default false;

update public.profiles set is_super_admin = true where role = 'super_admin';

-- Backfill: cada profile con gym genera su membership. El super_admin queda
-- como owner de su gym (el flag global vive en profiles.is_super_admin).
insert into public.memberships (user_id, gym_id, role, status)
select
  user_id,
  gym_id,
  case when role = 'super_admin' then 'owner' else role end,
  case when is_active then 'active' else 'inactive' end
from public.profiles
where gym_id is not null
on conflict (user_id, gym_id) do nothing;

-- Trigger de compatibilidad: mientras existan builds viejos que leen
-- profiles.gym_id/role, se reflejan desde memberships SOLO cuando la persona
-- tiene exactamente 1 membership activa (con >1 el build viejo no es soportado).
create or replace function public.sync_profile_from_membership()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_count int;
  v_gym uuid;
  v_role text;
begin
  select count(*) into v_count
  from public.memberships
  where user_id = v_user and status = 'active';

  if v_count = 1 then
    select gym_id, role into v_gym, v_role
    from public.memberships
    where user_id = v_user and status = 'active';

    update public.profiles
    set gym_id = v_gym,
        role = case when is_super_admin then 'super_admin' else v_role end
    where user_id = v_user
      and (gym_id is distinct from v_gym
        or role is distinct from case when is_super_admin then 'super_admin' else v_role end);
  end if;

  return coalesce(new, old);
end;
$$;

create trigger memberships_sync_profile
  after insert or update or delete on public.memberships
  for each row execute function public.sync_profile_from_membership();

-- El guard de profiles bloquea cambios de gym_id/role hechos por no-admins;
-- el trigger de compatibilidad necesita pasar (pg_trigger_depth > 1).
create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  -- Service role / backend sin JWT (p.ej. edge functions): sin restricción.
  -- pg_trigger_depth > 1: update originado en otro trigger (compat memberships).
  if auth.uid() is null or pg_trigger_depth() > 1 then
    return new;
  end if;
  -- Admin/owner/super_admin del gym del perfil: pueden cambiar cualquier columna.
  if public.is_admin_of(old.gym_id) then
    return new;
  end if;
  -- Resto (self-update): columnas privilegiadas inmutables.
  if new.id           is distinct from old.id
     or new.user_id   is distinct from old.user_id
     or new.gym_id    is distinct from old.gym_id
     or new.role      is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.is_super_admin is distinct from old.is_super_admin
     or new.active_plan_id is distinct from old.active_plan_id
     or new.created_at is distinct from old.created_at then
    raise exception 'No autorizado a modificar campos privilegiados del perfil';
  end if;
  return new;
end;
$$;

-- RLS de memberships. Regla anti-recursión: la fila propia se chequea por
-- columna directa; las ramas de staff usan helpers SECURITY DEFINER (bypassean
-- RLS de memberships). Nunca subquery directa sobre memberships acá.
alter table public.memberships enable row level security;

create policy memberships_select_own on public.memberships
  for select using (user_id = auth.uid());

create policy memberships_select_staff on public.memberships
  for select using (public.is_staff_of(gym_id));

create policy memberships_admin_write on public.memberships
  for all using (public.is_admin_of(gym_id))
  with check (public.is_admin_of(gym_id));

-- ==========================================
-- 20260611121000_rls_v2_memberships.sql
-- ==========================================
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

-- ==========================================
-- 20260611122000_harden_function_grants.sql
-- ==========================================
-- Endurecimiento post-advisors: las funciones de trigger no se llaman por RPC
-- y los helpers RLS no deben ser ejecutables por anon. OJO: authenticated SÍ
-- necesita EXECUTE en los helpers — las policies se evalúan como el caller.
-- email_exists / email_exists_in_gym quedan anon a propósito (pre-check de login).

alter function public.set_updated_at() set search_path = public, pg_temp;

revoke execute on function public.sync_profile_from_membership() from anon, authenticated, public;
revoke execute on function public.guard_profile_self_update() from anon, authenticated, public;
revoke execute on function public.set_updated_at() from anon, authenticated, public;

revoke execute on function public.auth_gym_ids() from anon;
revoke execute on function public.auth_gym_id() from anon;
revoke execute on function public.auth_profile_id() from anon;
revoke execute on function public.is_staff_of(uuid) from anon;
revoke execute on function public.is_admin_of(uuid) from anon;
revoke execute on function public.is_super_admin() from anon;
revoke execute on function public.shares_gym_with(uuid) from anon;
revoke execute on function public.user_in_admin_gym(uuid) from anon;
revoke execute on function public.check_in_with_qr(text) from anon;

-- Solo la corre pg_cron (rol postgres).
revoke execute on function public.purge_soft_deleted() from anon, authenticated;

-- ==========================================
-- 20260611123000_drop_profiles_legacy_columns.sql
-- ==========================================
-- Fase 4 de la migración multi-gym: no hay builds viejos en circulación, así
-- que se elimina la capa de compatibilidad. La pertenencia y el rol viven
-- EXCLUSIVAMENTE en memberships; profiles queda como identidad global.

-- 1. Trigger de compatibilidad (mantenía profiles.gym_id/role desde memberships)
drop trigger if exists memberships_sync_profile on public.memberships;
drop function if exists public.sync_profile_from_membership();

-- 2. Guard de self-update sin las columnas legacy: la rama admin se resuelve
-- por memberships del usuario objetivo, ya no por el gym_id de la fila.
create or replace function public.guard_profile_self_update()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  -- Service role / backend sin JWT (p.ej. edge functions): sin restricción.
  if auth.uid() is null then
    return new;
  end if;
  -- Admin/owner de algún gym del usuario objetivo (o super_admin): todo permitido.
  if public.user_in_admin_gym(old.user_id) then
    return new;
  end if;
  -- Resto (self-update): columnas privilegiadas inmutables.
  if new.id           is distinct from old.id
     or new.user_id   is distinct from old.user_id
     or new.is_active is distinct from old.is_active
     or new.is_super_admin is distinct from old.is_super_admin
     or new.active_plan_id is distinct from old.active_plan_id
     or new.created_at is distinct from old.created_at then
    raise exception 'No autorizado a modificar campos privilegiados del perfil';
  end if;
  return new;
end;
$$;

-- 3. Policy de escritura admin sin la rama legacy por gym_id de la fila.
drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all using (public.user_in_admin_gym(user_id))
  with check (public.user_in_admin_gym(user_id));

-- 4. RPC y helper del modelo viejo (login por gym / gym del perfil).
drop function if exists public.email_exists_in_gym(text, uuid);
drop function if exists public.auth_gym_id();

-- 5. Columnas legacy.
alter table public.profiles drop column if exists gym_id;
alter table public.profiles drop column if exists role;

-- ==========================================
-- 20260614120000_gyms_update_policy.sql
-- ==========================================
-- Permite que el super_admin edite los datos de cualquier gimnasio desde el
-- panel web. La tabla gyms tenía RLS con solo policy de SELECT (gyms_select),
-- por lo que un UPDATE directo desde el cliente quedaba bloqueado. El borrado
-- NO se habilita por RLS: va por la edge function eliminar-gym (service role),
-- que además limpia session_logs (FK NO ACTION) y borra cuentas huérfanas.

drop policy if exists gyms_update on public.gyms;
create policy gyms_update on public.gyms
  for update using (public.is_super_admin())
  with check (public.is_super_admin());

-- ==========================================
-- 20260615120000_gym_suspension.sql
-- ==========================================
-- Suspensión de gimnasios (soft, reversible, en cascada).
-- Igual que profiles.is_active da de baja a una persona, gyms.is_active suspende
-- al gimnasio entero. Como TODO el acceso a datos del gym pasa por auth_gym_ids(),
-- is_staff_of() e is_admin_of() (que ya filtran memberships.status='active'),
-- sumar el chequeo de g.is_active a esas tres funciones corta de una sola vez el
-- acceso a gyms, exercises_base, equipment, sessions, training_plans,
-- plan_assignments, attendances, qr tokens y todos los árboles de planes/logs.
-- No se borra nada: reactivar (is_active=true) restablece todo intacto.
-- Solo el super_admin puede flipear el flag (policy gyms_update ya existente).

-- Flag de actividad del gym (gyms creados antes de esta migración quedan activos).
alter table public.gyms
  add column if not exists is_active boolean not null default true;

-- ── Helpers de rol/scope: ahora excluyen gyms suspendidos ──────────────────
-- El super_admin conserva el bypass: debe poder ver/gestionar gyms suspendidos
-- para reactivarlos.

create or replace function public.auth_gym_ids()
returns setof uuid
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select m.gym_id
  from public.memberships m
  join public.gyms g on g.id = m.gym_id
  where m.user_id = auth.uid()
    and m.status = 'active'
    and g.is_active;
$$;

create or replace function public.is_staff_of(g uuid)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.is_super_admin() or exists (
    select 1
    from public.memberships m
    join public.gyms gg on gg.id = m.gym_id
    where m.user_id = auth.uid()
      and m.gym_id = g
      and m.status = 'active'
      and m.role in ('owner', 'admin', 'coach')
      and gg.is_active
  );
$$;

create or replace function public.is_admin_of(g uuid)
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.is_super_admin() or exists (
    select 1
    from public.memberships m
    join public.gyms gg on gg.id = m.gym_id
    where m.user_id = auth.uid()
      and m.gym_id = g
      and m.status = 'active'
      and m.role in ('owner', 'admin')
      and gg.is_active
  );
$$;

-- ── gyms_select: desacoplado de auth_gym_ids() ─────────────────────────────
-- El cliente necesita poder LEER su gym aunque esté suspendido, para detectar
-- is_active=false y forzar el cierre de sesión. Por eso esta policy usa un
-- EXISTS directo sobre memberships, independiente de gyms.is_active. El resto
-- de las tablas (datos del gym) sí quedan cortadas vía los helpers de arriba.
drop policy if exists gyms_select on public.gyms;
create policy gyms_select on public.gyms
  for select using (
    public.is_super_admin()
    or exists (
      select 1 from public.memberships m
      where m.gym_id = gyms.id
        and m.user_id = auth.uid()
        and m.status = 'active'
    )
  );

-- ==========================================
-- 20260615130000_delete_gym_cascade_rpc.sql
-- ==========================================
-- Borrado atómico de un gimnasio y todo su contenido (solo backend / service role).
--
-- El DELETE directo sobre gyms confiando en el cascade fallaba: exercises_base es
-- referenciado por FKs ON DELETE NO ACTION (session_exercises.exercise_id y
-- session_set_logs.exercise_id), constraints protectoras que impiden borrar un
-- ejercicio en uso. Al borrar el gym, el cascade intentaba eliminar exercises_base
-- antes/sin eliminar esas referencias y abortaba todo el statement (rollback).
--
-- Esta función borra en orden de dependencias dentro de UNA sola transacción, de modo
-- que cuando se eliminan los exercises_base ya no quedan referencias NO ACTION vivas:
--   1. session_logs   -> cascada session_set_logs (libera su ref a exercises_base)
--   2. sessions       -> cascada session_exercises (libera su ref a exercises_base)
--   3. exercises_base  (ya sin referrers NO ACTION)
--   4. gyms           -> cascada memberships, equipment, attendances, plan_assignments,
--                        training_plans, gym_qr_tokens y sus descendientes (todo CASCADE)
--
-- Devuelve los user_id que tras el borrado ya no pertenecen a ningún gym, para que la
-- edge function eliminar-gym elimine sus cuentas de auth (auth.admin.deleteUser).
create or replace function public.delete_gym_cascade(p_gym_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member_ids uuid[];
  v_orphans    uuid[];
begin
  -- Miembros del gym ANTES del borrado (para evaluar huérfanos después).
  select coalesce(
           array_agg(distinct user_id) filter (where user_id is not null),
           '{}'::uuid[]
         )
    into v_member_ids
  from memberships
  where gym_id = p_gym_id;

  -- Borrado en orden de dependencias.
  delete from session_logs   where gym_id = p_gym_id;  -- -> session_set_logs
  delete from sessions       where gym_id = p_gym_id;  -- -> session_exercises
  delete from exercises_base where gym_id = p_gym_id;
  delete from gyms           where id     = p_gym_id;   -- -> resto del árbol (cascade)

  -- user_id que ya no tienen membership en ningún gym.
  select coalesce(array_agg(uid), '{}'::uuid[])
    into v_orphans
  from unnest(v_member_ids) as uid
  where not exists (
    select 1 from memberships m where m.user_id = uid
  );

  return v_orphans;
end;
$$;

-- Solo el backend (service role) la invoca; ningún cliente con JWT debe poder llamarla.
revoke all on function public.delete_gym_cascade(uuid) from public, anon, authenticated;

-- ==========================================
-- 20260615131000_delete_gym_cascade_cloudinary.sql
-- ==========================================
-- Limpieza de assets de Cloudinary al borrar un gym.
--
-- delete_gym_cascade (ver 20260615130000) borraba el gym y su contenido pero dejaba
-- huérfanos en Cloudinary el logo, las imágenes/videos de ejercicios, las portadas de
-- sesiones/planes, las imágenes de equipamiento y (para socios que quedan sin ningún
-- gym) su avatar y contenido custom. No hay trigger que dispare sync-cloudinary-webhook,
-- así que nada se limpiaba.
--
-- Solución: encolar los public_id en public.cloudinary_delete_queue dentro de la misma
-- transacción del borrado. El cron diario `cleanup-pending-cloudinary` ejecuta la edge
-- function cleanUp-cloudinary, que procesa esa cola y borra los assets con reintentos.
-- Las columnas guardan el public_id con prefijo de carpeta (images/xxx, videos/xxx),
-- idéntico a lo que la cola y el cron esperan, así que se insertan tal cual.
create or replace function public.delete_gym_cascade(p_gym_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member_ids uuid[];
  v_orphans    uuid[];
begin
  -- Miembros del gym ANTES del borrado (para evaluar huérfanos después).
  select coalesce(
           array_agg(distinct user_id) filter (where user_id is not null),
           '{}'::uuid[]
         )
    into v_member_ids
  from memberships
  where gym_id = p_gym_id;

  -- Encolar assets del gym ANTES de borrar las filas que los referencian.
  -- video_uri -> 'video'; el resto -> 'image'. UNIQUE(public_id) => on conflict skip.
  insert into cloudinary_delete_queue (public_id, resource_type)
  select public_id, resource_type
  from (
    select logo_url        as public_id, 'image' as resource_type from gyms where id = p_gym_id
    union all
    select logo_url_dark,   'image' from gyms where id = p_gym_id
    union all
    select image_uri,       'image' from exercises_base where gym_id = p_gym_id
    union all
    select video_uri,       'video' from exercises_base where gym_id = p_gym_id
    union all
    select cover_image_uri, 'image' from sessions where gym_id = p_gym_id
    union all
    select cover_image_uri, 'image' from training_plans where gym_id = p_gym_id
    union all
    select image_uri,       'image' from equipment where gym_id = p_gym_id
  ) a
  where public_id is not null
  on conflict (public_id) do nothing;

  -- Borrado en orden de dependencias.
  delete from session_logs   where gym_id = p_gym_id;  -- -> session_set_logs
  delete from sessions       where gym_id = p_gym_id;  -- -> session_exercises
  delete from exercises_base where gym_id = p_gym_id;
  delete from gyms           where id     = p_gym_id;   -- -> resto del árbol (cascade)

  -- user_id que ya no tienen membership en ningún gym.
  select coalesce(array_agg(uid), '{}'::uuid[])
    into v_orphans
  from unnest(v_member_ids) as uid
  where not exists (
    select 1 from memberships m where m.user_id = uid
  );

  -- Encolar assets personales de los socios huérfanos (sus filas aún existen; la edge
  -- function eliminar-gym borra esas cuentas auth después, arrastrando profiles/custom_*).
  -- Las custom_* son user-scoped: se filtran por huérfano para no borrar contenido de
  -- socios que siguen en otro gym.
  if array_length(v_orphans, 1) is not null then
    insert into cloudinary_delete_queue (public_id, resource_type)
    select public_id, resource_type
    from (
      select image_profile   as public_id, 'image' as resource_type from profiles where user_id = any(v_orphans)
      union all
      select image_uri,       'image' from custom_exercises where user_id = any(v_orphans)
      union all
      select video_uri,       'video' from custom_exercises where user_id = any(v_orphans)
      union all
      select cover_image_uri, 'image' from custom_sessions where user_id = any(v_orphans)
      union all
      select cover_image_uri, 'image' from custom_plans where user_id = any(v_orphans)
    ) a
    where public_id is not null
    on conflict (public_id) do nothing;
  end if;

  return v_orphans;
end;
$$;

revoke all on function public.delete_gym_cascade(uuid) from public, anon, authenticated;

-- ==========================================
-- 20260615132000_delete_gym_cascade_exempt_super_admin.sql
-- ==========================================
-- Excluir super_admins del borrado de cuentas al eliminar un gym.
--
-- delete_gym_cascade devuelve los user_id que quedan sin ningún gym para que la edge
-- function eliminar-gym borre sus cuentas auth. Pero un super_admin administra desde el
-- panel y puede no tener (o perder) membership sin que eso implique borrar su cuenta;
-- si además fuera miembro del gym borrado, se auto-eliminaría. Acá se los exceptúa: su
-- membership igual cae por cascade, pero su cuenta auth (y sus assets) se conservan.
create or replace function public.delete_gym_cascade(p_gym_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member_ids uuid[];
  v_orphans    uuid[];
begin
  select coalesce(
           array_agg(distinct user_id) filter (where user_id is not null),
           '{}'::uuid[]
         )
    into v_member_ids
  from memberships
  where gym_id = p_gym_id;

  insert into cloudinary_delete_queue (public_id, resource_type)
  select public_id, resource_type
  from (
    select logo_url        as public_id, 'image' as resource_type from gyms where id = p_gym_id
    union all
    select logo_url_dark,   'image' from gyms where id = p_gym_id
    union all
    select image_uri,       'image' from exercises_base where gym_id = p_gym_id
    union all
    select video_uri,       'video' from exercises_base where gym_id = p_gym_id
    union all
    select cover_image_uri, 'image' from sessions where gym_id = p_gym_id
    union all
    select cover_image_uri, 'image' from training_plans where gym_id = p_gym_id
    union all
    select image_uri,       'image' from equipment where gym_id = p_gym_id
  ) a
  where public_id is not null
  on conflict (public_id) do nothing;

  delete from session_logs   where gym_id = p_gym_id;
  delete from sessions       where gym_id = p_gym_id;
  delete from exercises_base where gym_id = p_gym_id;
  delete from gyms           where id     = p_gym_id;

  -- Huérfanos: sin membership en ningún gym Y que NO sean super_admin.
  select coalesce(array_agg(uid), '{}'::uuid[])
    into v_orphans
  from unnest(v_member_ids) as uid
  where not exists (select 1 from memberships m where m.user_id = uid)
    and not exists (select 1 from profiles p where p.user_id = uid and p.is_super_admin);

  if array_length(v_orphans, 1) is not null then
    insert into cloudinary_delete_queue (public_id, resource_type)
    select public_id, resource_type
    from (
      select image_profile   as public_id, 'image' as resource_type from profiles where user_id = any(v_orphans)
      union all
      select image_uri,       'image' from custom_exercises where user_id = any(v_orphans)
      union all
      select video_uri,       'video' from custom_exercises where user_id = any(v_orphans)
      union all
      select cover_image_uri, 'image' from custom_sessions where user_id = any(v_orphans)
      union all
      select cover_image_uri, 'image' from custom_plans where user_id = any(v_orphans)
    ) a
    where public_id is not null
    on conflict (public_id) do nothing;
  end if;

  return v_orphans;
end;
$$;

revoke all on function public.delete_gym_cascade(uuid) from public, anon, authenticated;

-- ==========================================
-- 20260616190000_fix_delete_gym_cascade_text_user_id.sql
-- ==========================================
-- Fix: el borrado de un gym fallaba con "operator does not exist: text = uuid"
-- cuando el gym tenía miembros que quedaban huérfanos.
--
-- delete_gym_cascade arma v_orphans (uuid[]) desde memberships/profiles (user_id uuid),
-- pero el bloque de huérfanos consulta custom_exercises/custom_sessions/custom_plans,
-- cuya columna user_id es TEXT. Las comparaciones `user_id = any(v_orphans)` quedaban
-- como text = uuid[], Postgres las rechazaba y abortaba toda la transacción del RPC,
-- por lo que el gym nunca se borraba (la edge function devolvía 400).
--
-- Solución: castear v_orphans a text[] en esas tres subconsultas. profiles (user_id uuid)
-- queda sin cambios. El resto del cuerpo es idéntico a 20260615132000.
create or replace function public.delete_gym_cascade(p_gym_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member_ids uuid[];
  v_orphans    uuid[];
begin
  select coalesce(
           array_agg(distinct user_id) filter (where user_id is not null),
           '{}'::uuid[]
         )
    into v_member_ids
  from memberships
  where gym_id = p_gym_id;

  insert into cloudinary_delete_queue (public_id, resource_type)
  select public_id, resource_type
  from (
    select logo_url        as public_id, 'image' as resource_type from gyms where id = p_gym_id
    union all
    select logo_url_dark,   'image' from gyms where id = p_gym_id
    union all
    select image_uri,       'image' from exercises_base where gym_id = p_gym_id
    union all
    select video_uri,       'video' from exercises_base where gym_id = p_gym_id
    union all
    select cover_image_uri, 'image' from sessions where gym_id = p_gym_id
    union all
    select cover_image_uri, 'image' from training_plans where gym_id = p_gym_id
    union all
    select image_uri,       'image' from equipment where gym_id = p_gym_id
  ) a
  where public_id is not null
  on conflict (public_id) do nothing;

  delete from session_logs   where gym_id = p_gym_id;
  delete from sessions       where gym_id = p_gym_id;
  delete from exercises_base where gym_id = p_gym_id;
  delete from gyms           where id     = p_gym_id;

  -- Huérfanos: sin membership en ningún gym Y que NO sean super_admin.
  select coalesce(array_agg(uid), '{}'::uuid[])
    into v_orphans
  from unnest(v_member_ids) as uid
  where not exists (select 1 from memberships m where m.user_id = uid)
    and not exists (select 1 from profiles p where p.user_id = uid and p.is_super_admin);

  if array_length(v_orphans, 1) is not null then
    insert into cloudinary_delete_queue (public_id, resource_type)
    select public_id, resource_type
    from (
      select image_profile   as public_id, 'image' as resource_type from profiles where user_id = any(v_orphans)
      union all
      select image_uri,       'image' from custom_exercises where user_id = any(v_orphans::text[])
      union all
      select video_uri,       'video' from custom_exercises where user_id = any(v_orphans::text[])
      union all
      select cover_image_uri, 'image' from custom_sessions where user_id = any(v_orphans::text[])
      union all
      select cover_image_uri, 'image' from custom_plans where user_id = any(v_orphans::text[])
    ) a
    where public_id is not null
    on conflict (public_id) do nothing;
  end if;

  return v_orphans;
end;
$$;

revoke all on function public.delete_gym_cascade(uuid) from public, anon, authenticated;

-- ==========================================
-- 20260616191000_unify_custom_user_id_to_uuid.sql
-- ==========================================
-- Unifica el tipo de user_id en las tablas custom_* a uuid con FK a auth.users.
--
-- Antes: custom_exercises/custom_sessions/custom_plans.user_id era TEXT sin FK,
-- mientras profiles/memberships usan uuid con FK a auth.users. Esa inconsistencia
-- obligaba a castear en delete_gym_cascade (ver 20260616190000) y rompía comparaciones
-- text=uuid. Acá se corrige de raíz:
--   1) se pasan las columnas a uuid (todos los valores ya son uuids válidos y existen
--      en auth.users; verificado: 0 nulls, 0 fuera de formato, 0 huérfanos),
--   2) se agrega FK a auth.users(id) on delete cascade (limpia los items custom cuando
--      se borra la cuenta, igual que el resto de los datos personales),
--   3) se recrean las policies RLS comparando contra auth.uid() (uuid) en vez de
--      (auth.uid())::text,
--   4) se revierte el cast ::text[] en delete_gym_cascade (ya no hace falta).

-- ===== custom_exercises =====
drop policy if exists custom_exercises_select on public.custom_exercises;
drop policy if exists custom_exercises_insert on public.custom_exercises;
drop policy if exists custom_exercises_update on public.custom_exercises;
drop policy if exists custom_exercises_delete on public.custom_exercises;

alter table public.custom_exercises
  alter column user_id type uuid using user_id::uuid;
alter table public.custom_exercises
  add constraint custom_exercises_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
create index if not exists custom_exercises_user_id_idx
  on public.custom_exercises (user_id);

create policy custom_exercises_select on public.custom_exercises
  for select using (user_id = auth.uid());
create policy custom_exercises_insert on public.custom_exercises
  for insert with check (user_id = auth.uid());
create policy custom_exercises_update on public.custom_exercises
  for update using (user_id = auth.uid());
create policy custom_exercises_delete on public.custom_exercises
  for delete using (user_id = auth.uid());

-- ===== custom_sessions =====
drop policy if exists custom_sessions_select on public.custom_sessions;
drop policy if exists custom_sessions_insert on public.custom_sessions;
drop policy if exists custom_sessions_update on public.custom_sessions;
drop policy if exists custom_sessions_delete on public.custom_sessions;

alter table public.custom_sessions
  alter column user_id type uuid using user_id::uuid;
alter table public.custom_sessions
  add constraint custom_sessions_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
create index if not exists custom_sessions_user_id_idx
  on public.custom_sessions (user_id);

create policy custom_sessions_select on public.custom_sessions
  for select using (user_id = auth.uid());
create policy custom_sessions_insert on public.custom_sessions
  for insert with check (user_id = auth.uid());
create policy custom_sessions_update on public.custom_sessions
  for update using (user_id = auth.uid());
create policy custom_sessions_delete on public.custom_sessions
  for delete using (user_id = auth.uid());

-- ===== custom_plans =====
drop policy if exists custom_plans_select on public.custom_plans;
drop policy if exists custom_plans_insert on public.custom_plans;
drop policy if exists custom_plans_update on public.custom_plans;
drop policy if exists custom_plans_delete on public.custom_plans;

alter table public.custom_plans
  alter column user_id type uuid using user_id::uuid;
alter table public.custom_plans
  add constraint custom_plans_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
create index if not exists custom_plans_user_id_idx
  on public.custom_plans (user_id);

create policy custom_plans_select on public.custom_plans
  for select using (user_id = auth.uid());
create policy custom_plans_insert on public.custom_plans
  for insert with check (user_id = auth.uid());
create policy custom_plans_update on public.custom_plans
  for update using (user_id = auth.uid());
create policy custom_plans_delete on public.custom_plans
  for delete using (user_id = auth.uid());

-- ===== revertir el cast ::text[] en delete_gym_cascade =====
-- Ahora custom_*.user_id es uuid, así que v_orphans (uuid[]) compara directo.
create or replace function public.delete_gym_cascade(p_gym_id uuid)
returns uuid[]
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member_ids uuid[];
  v_orphans    uuid[];
begin
  select coalesce(
           array_agg(distinct user_id) filter (where user_id is not null),
           '{}'::uuid[]
         )
    into v_member_ids
  from memberships
  where gym_id = p_gym_id;

  insert into cloudinary_delete_queue (public_id, resource_type)
  select public_id, resource_type
  from (
    select logo_url        as public_id, 'image' as resource_type from gyms where id = p_gym_id
    union all
    select logo_url_dark,   'image' from gyms where id = p_gym_id
    union all
    select image_uri,       'image' from exercises_base where gym_id = p_gym_id
    union all
    select video_uri,       'video' from exercises_base where gym_id = p_gym_id
    union all
    select cover_image_uri, 'image' from sessions where gym_id = p_gym_id
    union all
    select cover_image_uri, 'image' from training_plans where gym_id = p_gym_id
    union all
    select image_uri,       'image' from equipment where gym_id = p_gym_id
  ) a
  where public_id is not null
  on conflict (public_id) do nothing;

  delete from session_logs   where gym_id = p_gym_id;
  delete from sessions       where gym_id = p_gym_id;
  delete from exercises_base where gym_id = p_gym_id;
  delete from gyms           where id     = p_gym_id;

  select coalesce(array_agg(uid), '{}'::uuid[])
    into v_orphans
  from unnest(v_member_ids) as uid
  where not exists (select 1 from memberships m where m.user_id = uid)
    and not exists (select 1 from profiles p where p.user_id = uid and p.is_super_admin);

  if array_length(v_orphans, 1) is not null then
    insert into cloudinary_delete_queue (public_id, resource_type)
    select public_id, resource_type
    from (
      select image_profile   as public_id, 'image' as resource_type from profiles where user_id = any(v_orphans)
      union all
      select image_uri,       'image' from custom_exercises where user_id = any(v_orphans)
      union all
      select video_uri,       'video' from custom_exercises where user_id = any(v_orphans)
      union all
      select cover_image_uri, 'image' from custom_sessions where user_id = any(v_orphans)
      union all
      select cover_image_uri, 'image' from custom_plans where user_id = any(v_orphans)
    ) a
    where public_id is not null
    on conflict (public_id) do nothing;
  end if;

  return v_orphans;
end;
$$;

revoke all on function public.delete_gym_cascade(uuid) from public, anon, authenticated;

-- ==========================================
-- 20260616192000_email_log.sql
-- ==========================================
-- email_log: registro de cada mail transaccional enviado por la app (vía Resend).
-- Permite conteo por gym (visibilidad + quotas a futuro) y trackeo de estado de
-- entrega vía webhook de Resend. Los mails de login (OTP) NO pasan por acá: salen
-- por el SMTP de Auth y no se pueden atribuir a un gym.

create table public.email_log (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid references public.gyms(id) on delete set null,  -- null = mail de plataforma
  to_email    text not null,
  type        text not null,                 -- 'welcome_member' | 'welcome_owner' | ...
  subject     text,
  resend_id   text unique,                   -- id que devuelve la API de Resend
  status      text not null default 'sent',  -- sent|delivered|bounced|complained|delivery_delayed|failed
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index email_log_gym_created_idx on public.email_log (gym_id, created_at desc);
create index email_log_resend_id_idx   on public.email_log (resend_id);

alter table public.email_log enable row level security;

-- Escritura: solo las edge functions (service role) escriben; bypassean RLS, sin policy.
-- Lectura: staff admin/owner ve los logs de su gym; super_admin ve todo (incluida
-- plataforma, gym_id null). Reusa is_admin_of() de la RLS v2. Member no lee.
create policy email_log_admin_select on public.email_log
  for select using (public.is_admin_of(gym_id));

-- ==========================================
-- 20260618120000_default_catalog.sql
-- ==========================================
-- Catálogo de contenido por default (ejercicios + sesiones + planes), activable por gym.
--
-- Modelo: el catálogo NO se clona. Vive como filas de las tablas existentes
-- (exercises_base / sessions / training_plans + sus hijas) con gym_id NULL e
-- is_catalog = true, curadas por el super_admin y legibles por cualquier gym.
-- Editar = forkear a custom_* (flujo ya existente, sin cambios). El flag
-- gyms.default_catalog decide en el cliente si la biblioteca del gym lo muestra.
--
-- Escritura: las policies de insert/update/delete existentes están keyeadas por
-- is_staff_of(gym_id)/is_admin_of(gym_id). Para una fila de catálogo gym_id es NULL,
-- y is_staff_of(NULL) = is_admin_of(NULL) = is_super_admin() (porque m.gym_id = NULL
-- nunca matchea). Por eso esas policies YA bloquean a staff y YA permiten al
-- super_admin sobre filas de catálogo, sin necesidad de modificarlas. Igual abajo
-- agregamos una policy aditiva explícita para garantizar el CRUD del super_admin.

-- ── 1. Columnas ────────────────────────────────────────────────────────────
alter table public.exercises_base add column if not exists is_catalog boolean not null default false;
alter table public.sessions       add column if not exists is_catalog boolean not null default false;
alter table public.training_plans  add column if not exists is_catalog boolean not null default false;
alter table public.gyms            add column if not exists default_catalog boolean not null default false;

-- ── 2. gym_id NULLable (el catálogo no tiene dueño) ────────────────────────
alter table public.exercises_base alter column gym_id drop not null;
alter table public.sessions       alter column gym_id drop not null;
alter table public.training_plans  alter column gym_id drop not null;

-- Índices parciales para que el pull dedicado de catálogo y la biblioteca filtren rápido.
create index if not exists exercises_base_is_catalog_idx on public.exercises_base (is_catalog) where is_catalog;
create index if not exists sessions_is_catalog_idx       on public.sessions (is_catalog)       where is_catalog;
create index if not exists training_plans_is_catalog_idx on public.training_plans (is_catalog) where is_catalog;

-- ── 3. SELECT policies: sumar `or is_catalog` (padres) / `or <padre>.is_catalog` (hijas) ──

drop policy if exists exercises_base_select on public.exercises_base;
create policy exercises_base_select on public.exercises_base
  for select using (
    gym_id in (select public.auth_gym_ids()) or is_catalog or public.is_super_admin()
  );

drop policy if exists sessions_select on public.sessions;
create policy sessions_select on public.sessions
  for select using (
    gym_id in (select public.auth_gym_ids()) or is_catalog or public.is_super_admin()
  );

drop policy if exists training_plans_select on public.training_plans;
create policy training_plans_select on public.training_plans
  for select using (
    gym_id in (select public.auth_gym_ids()) or is_catalog or public.is_super_admin()
  );

drop policy if exists exercise_equipment_select on public.exercise_equipment;
create policy exercise_equipment_select on public.exercise_equipment
  for select using (
    exists (
      select 1 from public.exercises_base e
      where e.id = exercise_equipment.exercise_id
        and (e.gym_id in (select public.auth_gym_ids()) or e.is_catalog or public.is_super_admin())
    )
  );

drop policy if exists session_exercises_select on public.session_exercises;
create policy session_exercises_select on public.session_exercises
  for select using (
    exists (
      select 1 from public.sessions s
      where s.id = session_exercises.session_id
        and (s.gym_id in (select public.auth_gym_ids()) or s.is_catalog or public.is_super_admin())
    )
  );

drop policy if exists plan_weeks_select on public.plan_weeks;
create policy plan_weeks_select on public.plan_weeks
  for select using (
    exists (
      select 1 from public.training_plans tp
      where tp.id = plan_weeks.plan_id
        and (tp.gym_id in (select public.auth_gym_ids()) or tp.is_catalog or public.is_super_admin())
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
        and (tp.gym_id in (select public.auth_gym_ids()) or tp.is_catalog or public.is_super_admin())
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
        and (tp.gym_id in (select public.auth_gym_ids()) or tp.is_catalog or public.is_super_admin())
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
        and (tp.gym_id in (select public.auth_gym_ids()) or tp.is_catalog or public.is_super_admin())
    )
  );

-- ── 4. CRUD de catálogo garantizado para super_admin (aditivo, permissive/OR) ──
-- No restringe a nadie (RLS es permissive): solo garantiza que el super_admin pueda
-- gestionar el contenido de catálogo sin depender de cómo estén keyeadas las policies
-- de escritura preexistentes.
drop policy if exists exercises_base_super_admin_all on public.exercises_base;
create policy exercises_base_super_admin_all on public.exercises_base
  for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists sessions_super_admin_all on public.sessions;
create policy sessions_super_admin_all on public.sessions
  for all using (public.is_super_admin()) with check (public.is_super_admin());

drop policy if exists training_plans_super_admin_all on public.training_plans;
create policy training_plans_super_admin_all on public.training_plans
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ── 5. delete_gym_cascade: las filas de catálogo (gym_id NULL) ya quedan fuera ──
-- delete_gym_cascade (última versión en 20260616190000) borra y encola Cloudinary
-- SOLO `where gym_id = p_gym_id`. Como las filas de catálogo tienen gym_id NULL,
-- nunca matchean: no se borran ni se encola su media compartida al eliminar un gym.
-- No requiere cambios; se documenta acá la garantía.

-- ==========================================
-- 20260618130000_catalog_authoring_rpcs.sql
-- ==========================================
-- Autoría de SESIONES y PLANES de catálogo desde el panel web (super_admin).
--
-- El panel web no pasa por el sync single-gym de SQLite: escribe DIRECTO a Supabase.
-- Un INSERT a varias tablas (plan → semanas → días → ejercicios → series) que falle a
-- la mitad dejaría un árbol corrupto, así que lo encapsulamos en estos RPC que corren
-- todo en UNA transacción.
--
-- Son SECURITY DEFINER con guard explícito is_super_admin(): las policies de escritura
-- de las tablas hijas (session_exercises, plan_week_*) viven en el schema base y no las
-- modificamos acá; definer + guard garantiza el CRUD de catálogo sin depender de ellas.
-- Las filas se crean siempre con is_catalog = true y gym_id = NULL.

-- ── Sesión de catálogo ───────────────────────────────────────────────────────
-- payload: { id?, name, description?, level?, cover_image_uri?,
--            exercises: [{ id?, exercise_id, position }] }
-- Preserva los session_exercises.id existentes (los planes de catálogo los referencian
-- por session_exercise_id); borra los que se quitaron, cascada a plan_week_day_exercises.
create or replace function public.save_catalog_session(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_session_id uuid;
  v_now        timestamptz := now();
  v_keep_ids   uuid[];
  v_removed    uuid[];
  v_ex         jsonb;
  v_idx        int := 0;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden: super_admin required';
  end if;

  v_session_id := nullif(payload->>'id', '')::uuid;

  if v_session_id is null then
    v_session_id := gen_random_uuid();
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
  select coalesce(array_agg((e->>'id')::uuid), '{}'::uuid[])
  into v_keep_ids
  from jsonb_array_elements(coalesce(payload->'exercises', '[]'::jsonb)) e
  where nullif(e->>'id', '') is not null;

  -- session_exercises a borrar (existían pero ya no están en el payload)
  select coalesce(array_agg(se.id), '{}'::uuid[])
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
        set position = v_idx, exercise_id = (v_ex->>'exercise_id')::uuid
      where id = (v_ex->>'id')::uuid;
    else
      insert into public.session_exercises (id, session_id, exercise_id, position)
      values (gen_random_uuid(), v_session_id, (v_ex->>'exercise_id')::uuid, v_idx);
    end if;
    v_idx := v_idx + 1;
  end loop;

  return v_session_id;
end;
$$;

-- ── Plan de catálogo ─────────────────────────────────────────────────────────
-- payload: { id?, name, description?, objective?, level?, target_gender,
--            weekly_days, duration_weeks, cover_image_uri?,
--            weeks: [{ week_number, days: [{ day_number, session_id,
--              exercises: [{ session_exercise_id, position, prescription_mode,
--                rest_seconds, intensity_mode, tempo, notes,
--                sets: [{ set_number, reps_min, reps_max, weight_kg,
--                  duration_seconds, rir, rpe }] }] }] }] }
-- En edición borra todo el árbol del plan y lo reescribe (igual que persistWeeks mobile).
-- Días sin session_id se omiten. IDs de semanas/días/ejercicios/series se generan acá.
create or replace function public.save_catalog_plan(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_plan_id uuid;
  v_now     timestamptz := now();
  v_week    jsonb;
  v_day     jsonb;
  v_ex      jsonb;
  v_set     jsonb;
  v_week_id uuid;
  v_day_id  uuid;
  v_ex_id   uuid;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden: super_admin required';
  end if;

  v_plan_id := nullif(payload->>'id', '')::uuid;

  if v_plan_id is null then
    v_plan_id := gen_random_uuid();
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
    v_week_id := gen_random_uuid();
    insert into public.plan_weeks (id, plan_id, week_number, created_at, updated_at)
    values (v_week_id, v_plan_id, (v_week->>'week_number')::int, v_now, v_now);

    for v_day in
      select value from jsonb_array_elements(coalesce(v_week->'days', '[]'::jsonb))
    loop
      continue when nullif(v_day->>'session_id', '') is null;

      v_day_id := gen_random_uuid();
      insert into public.plan_week_days
        (id, week_id, day_number, session_id, created_at, updated_at)
      values
        (v_day_id, v_week_id, (v_day->>'day_number')::int,
         (v_day->>'session_id')::uuid, v_now, v_now);

      for v_ex in
        select value from jsonb_array_elements(coalesce(v_day->'exercises', '[]'::jsonb))
      loop
        v_ex_id := gen_random_uuid();
        insert into public.plan_week_day_exercises
          (id, week_day_id, session_exercise_id, position, prescription_mode,
           rest_seconds, intensity_mode, tempo, notes, created_at, updated_at)
        values
          (v_ex_id, v_day_id, (v_ex->>'session_exercise_id')::uuid,
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
            (gen_random_uuid(), v_ex_id, (v_set->>'set_number')::int,
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
create or replace function public.delete_catalog_plan(p_plan_id uuid)
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
create or replace function public.delete_catalog_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_super_admin() then
    raise exception 'forbidden: super_admin required';
  end if;

  -- Limpiar referencias de planes de catálogo a los ejercicios de esta sesión
  delete from public.plan_week_day_exercise_sets where exercise_id in (
    select id from public.plan_week_day_exercises where session_exercise_id in (
      select id from public.session_exercises where session_id = p_session_id));
  delete from public.plan_week_day_exercises where session_exercise_id in (
    select id from public.session_exercises where session_id = p_session_id);
  -- Días de plan que apuntaban a esta sesión quedan sin sesión
  delete from public.plan_week_days where session_id = p_session_id;
  delete from public.session_exercises where session_id = p_session_id;
  delete from public.sessions where id = p_session_id and is_catalog = true;
end;
$$;

grant execute on function public.save_catalog_session(jsonb)   to authenticated;
grant execute on function public.save_catalog_plan(jsonb)      to authenticated;
grant execute on function public.delete_catalog_plan(uuid)     to authenticated;
grant execute on function public.delete_catalog_session(uuid)  to authenticated;

-- ==========================================
-- 20260618140000_fix_catalog_rpcs_text_ids.sql
-- ==========================================
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

-- ==========================================
-- 20260619120000_catalog_plan_archive.sql
-- ==========================================
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

-- ==========================================
-- 20260619223611_purge_archived_catalog_plans.sql
-- ==========================================
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

-- ==========================================
-- 20260623180415_activities.sql
-- ==========================================
-- Actividades del gimnasio: cada gym define su oferta (musculación, crossfit,
-- yoga, boxeo…) como productos con precio mensual. Es la capa base sobre la que
-- la próxima fase montará las suscripciones socio↔actividad y la cobranza.
--
-- Entidad ONLINE: la gestiona el admin conectado (panel), no entra al sync
-- offline. El socio la lee (SELECT) para, en la fase siguiente, suscribirse.

create table public.activities (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references public.gyms(id) on delete cascade,
  name        text not null,
  description text,
  color       text,                         -- chip/badge en UI (hex)
  price       numeric(10,2),                -- cuota mensual (semilla de suscripciones)
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index activities_gym_id_idx on public.activities (gym_id);
create unique index activities_gym_name_uniq on public.activities (gym_id, lower(name));

-- Reusa el trigger genérico definido en 20260611120000_memberships.sql.
create trigger activities_set_updated_at
  before update on public.activities
  for each row execute function public.set_updated_at();

alter table public.activities enable row level security;

-- SELECT: cualquier miembro activo del gym (el socio las necesita para suscribirse
-- en la fase siguiente) + super_admin.
create policy activities_select on public.activities
  for select using (
    gym_id in (select public.auth_gym_ids()) or public.is_super_admin()
  );

-- WRITE: solo admin/owner del gym (define la oferta comercial y los precios).
create policy activities_admin_write on public.activities
  for all using (public.is_admin_of(gym_id))
  with check (public.is_admin_of(gym_id));

-- ==========================================
-- 20260623182858_activity_plans.sql
-- ==========================================
-- Pases por actividad: el precio de un gimnasio depende de la frecuencia
-- (musculación 2x/semana vs 3x/semana vs libre). Modelamos cada frecuencia como
-- un PASE de la actividad, no como una actividad aparte. El precio se mueve de
-- activities al pase; la suscripción futura referenciará un activity_plan_id.

-- El precio ahora vive en el pase, no en la actividad (activities está vacía).
alter table public.activities drop column price;

create table public.activity_plans (
  id                 uuid primary key default gen_random_uuid(),
  activity_id        uuid not null references public.activities(id) on delete cascade,
  label              text not null,            -- "2 veces/semana", "Libre", "Pase mensual"
  frequency_per_week int,                      -- null = libre/ilimitado
  price              numeric(10,2),
  is_active          boolean not null default true,
  sort_order         int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint activity_plans_freq_positive
    check (frequency_per_week is null or frequency_per_week > 0)
);

create index activity_plans_activity_id_idx on public.activity_plans (activity_id);
create unique index activity_plans_label_uniq
  on public.activity_plans (activity_id, lower(label));

create trigger activity_plans_set_updated_at
  before update on public.activity_plans
  for each row execute function public.set_updated_at();

alter table public.activity_plans enable row level security;

-- RLS por la actividad padre (patrón de tablas hijas del repo: EXISTS sobre el padre).
create policy activity_plans_select on public.activity_plans
  for select using (
    exists (
      select 1 from public.activities a
      where a.id = activity_plans.activity_id
        and (a.gym_id in (select public.auth_gym_ids()) or public.is_super_admin())
    )
  );

create policy activity_plans_admin_write on public.activity_plans
  for all using (
    exists (
      select 1 from public.activities a
      where a.id = activity_plans.activity_id and public.is_admin_of(a.gym_id)
    )
  )
  with check (
    exists (
      select 1 from public.activities a
      where a.id = activity_plans.activity_id and public.is_admin_of(a.gym_id)
    )
  );

-- ==========================================
-- 20260623190539_activity_subscriptions.sql
-- ==========================================
-- Inscripción de socios a actividades: enlaza socio ↔ PASE (activity_plan), que
-- lleva la frecuencia + el precio contratado. Es la semilla de la suscripción,
-- con cobranza básica MANUAL (fecha de vencimiento + registro de pago). El estado
-- "al día / vencido" se deriva en cliente de due_date, no se persiste.
--
-- Calca el modelo de plan_assignments (socio↔plan), pero la escritura es solo
-- admin/owner (decisión comercial), no todo el staff.

create table public.activity_subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,   -- el socio
  gym_id            uuid not null references public.gyms(id) on delete cascade,        -- gym activo del staff
  activity_id       uuid not null references public.activities(id) on delete cascade,  -- denormalizado (unicidad + query)
  activity_plan_id  uuid not null references public.activity_plans(id) on delete cascade,
  price             numeric(10,2),                 -- snapshot del precio del pase al inscribir
  status            text not null default 'active'
    check (status in ('active','paused','cancelled')),
  start_date        date not null default current_date,
  end_date          date,                          -- al dar de baja
  due_date          date,                          -- próximo vencimiento (pago manual)
  last_payment_date date,                          -- último pago registrado
  assigned_by       uuid references public.profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index activity_subscriptions_user_idx on public.activity_subscriptions (user_id);
create index activity_subscriptions_gym_idx  on public.activity_subscriptions (gym_id);

-- Una sola inscripción ACTIVA por (socio, actividad): permite musculación+yoga,
-- bloquea musculación-2x y musculación-3x simultáneos.
create unique index activity_subscriptions_one_active
  on public.activity_subscriptions (user_id, activity_id) where status = 'active';

create trigger activity_subscriptions_set_updated_at
  before update on public.activity_subscriptions
  for each row execute function public.set_updated_at();

alter table public.activity_subscriptions enable row level security;

-- SELECT: el socio ve las suyas; el staff del gym, las de sus socios.
create policy activity_subscriptions_select on public.activity_subscriptions
  for select using (
    user_id = public.auth_profile_id() or public.is_staff_of(gym_id)
  );

-- WRITE: solo admin/owner del gym (decisión comercial).
create policy activity_subscriptions_admin_write on public.activity_subscriptions
  for all using (public.is_admin_of(gym_id))
  with check (public.is_admin_of(gym_id));

-- ==========================================
-- 20260623192007_activity_coach.sql
-- ==========================================
-- Coach opcional por actividad: permite designar quién la dicta, para filtrar
-- (p. ej. "actividades de tal coach") y, a futuro, imputar costos. Es opcional;
-- si el coach se elimina, la actividad queda sin coach (set null), no se borra.

alter table public.activities
  add column coach_id uuid references public.profiles(id) on delete set null;

create index activities_coach_id_idx on public.activities (coach_id);

-- ==========================================
-- 20260623203723_public_gym_rpcs.sql
-- ==========================================
-- Lectura pública (anónima) del subconjunto seguro de cada gimnasio, para las
-- páginas públicas por gym del sitio Next ([slug].gymtrack.ar).
--
-- El RLS de `gyms` (gyms_select) solo permite leer al super_admin o a miembros
-- activos → un visitante anónimo no puede leer nada. En vez de aflojar el RLS de
-- la tabla, exponemos SOLO columnas públicas (identidad + branding + contacto) de
-- gyms activos vía funciones SECURITY DEFINER, igual que los demás helpers del
-- proyecto. Nada de owner_id, flags internos ni datos de miembros.

-- Datos de un gym por slug (solo si está activo). Una fila o cero.
create or replace function public.get_public_gym(p_slug text)
returns table (
  slug          text,
  name          text,
  logo_url      text,
  logo_url_dark text,
  theme_primary text,
  theme_accent  text,
  address       text,
  phone         text,
  email         text,
  instagram     text
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select g.slug, g.name, g.logo_url, g.logo_url_dark, g.theme_primary,
         g.theme_accent, g.address, g.phone, g.email, g.instagram
  from public.gyms g
  where g.slug = p_slug
    and g.is_active = true;
$$;

-- Lista de gyms activos para el sitemap (slug + última actualización).
create or replace function public.list_public_gyms()
returns table (
  slug       text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select g.slug, g.updated_at
  from public.gyms g
  where g.is_active = true;
$$;

-- Solo lectura pública: cualquiera (anon) puede ejecutarlas; nadie puede escribir.
revoke all on function public.get_public_gym(text)  from public;
revoke all on function public.list_public_gyms()     from public;
grant execute on function public.get_public_gym(text) to anon, authenticated;
grant execute on function public.list_public_gyms()   to anon, authenticated;

-- ==========================================
-- 20260627141819_attendance_realtime.sql
-- ==========================================
-- Habilita Supabase Realtime para la tabla attendances.
-- Sin esto, las suscripciones postgres_changes no reciben eventos.
alter publication supabase_realtime add table public.attendances;

-- ==========================================
-- 20260629170921_fix_plan_assignments_update_policy.sql
-- ==========================================
-- La política UPDATE anterior solo permitía al propio member actualizar
-- sus asignaciones. El staff (coach/admin) no podía cerrar la asignación
-- activa anterior al asignar un nuevo plan.
-- Se amplía para permitir también al staff del gym operar sobre filas de sus alumnos.
drop policy if exists "usuario puede actualizar sus propias asignaciones" on public.plan_assignments;

create policy plan_assignments_update on public.plan_assignments
  for update using (
    user_id = (select (profiles.id)::text from profiles where profiles.user_id = auth.uid() limit 1)
    or public.is_staff_of(gym_id)
  );

-- ==========================================
-- 20260629210000_harden_plan_assignments_insert_policy.sql
-- ==========================================
-- Reemplaza la policy INSERT permisiva ("auth.uid() IS NOT NULL") por una que
-- espeja la lógica del UPDATE: solo el propio socio o staff del gym pueden insertar.
drop policy if exists "usuario o coach puede insertar" on public.plan_assignments;

create policy plan_assignments_insert on public.plan_assignments
  for insert with check (
    user_id = (public.auth_profile_id())::text
    or public.is_staff_of(gym_id)
  );

