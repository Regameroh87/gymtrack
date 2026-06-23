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
