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
