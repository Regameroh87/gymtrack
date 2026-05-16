-- Multi-tenant — paso 1
-- Crea la tabla `gyms` y agrega `gym_id` + `role` a `profiles`.
-- No toca el resto de tablas ni habilita RLS — eso va en pasos siguientes.

-- 1. Tabla gyms
create table public.gyms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger set_updated_at before update on public.gyms
  for each row execute function public.set_updated_at();

-- 2. profiles: agregar gym_id + role
-- Roles:
--   super_admin: dueño de la plataforma. NO pertenece a ningún gym.
--                Único autorizado para llamar a la edge function `crear-gym`.
--                Se bootstrappea manualmente con SQL (ver al final).
--   owner:       dueño de un gym. Pertenece al gym.
--   admin:       administrativo del gym (cobros, alta de socios).
--   coach:       entrenador del gym (catálogo, planes).
--   member:      socio/cliente del gym.
alter table public.profiles
  add column gym_id uuid references public.gyms(id),
  add column role   text check (role in ('super_admin','owner','admin','coach','member'));

-- gym_id nullable porque super_admin no pertenece a un gym, y el owner
-- se crea antes que su gym durante el bootstrap del tenant. El check
-- garantiza que admin/coach/member siempre tengan gym_id.
alter table public.profiles
  add constraint profile_gym_required
  check (role in ('super_admin','owner') or gym_id is not null);

-- Bootstrap manual del super_admin (ejecutar UNA VEZ tras aplicar la migración):
--   insert into public.profiles (id, role, email)
--   values ('<tu-uuid-de-auth.users>', 'super_admin', 'tu@email.com');
