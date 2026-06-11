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
