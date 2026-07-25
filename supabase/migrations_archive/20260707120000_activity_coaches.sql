-- Coaches por actividad (N:N) con esquema de pago embebido. Reemplaza el coach
-- único activities.coach_id: una actividad puede dictarla más de un coach y a
-- cada asignación se le atribuye cómo cobra (los tres campos son opcionales y
-- combinables):
--   monthly_fee       → fijo mensual por dictar la actividad
--   revenue_share_pct → % de los cobros de suscripciones de la actividad
--   rate_per_class    → tarifa por clase dictada (cuenta desde activity_classes)
--
-- Entidad ONLINE (panel admin): no entra al sync offline.

create table public.activity_coaches (
  id                uuid primary key default gen_random_uuid(),
  gym_id            uuid not null references public.gyms(id) on delete cascade, -- denormalizado para RLS directa
  activity_id       uuid not null references public.activities(id) on delete cascade,
  coach_id          uuid not null references public.profiles(id) on delete cascade,
  monthly_fee       numeric(10,2),
  revenue_share_pct numeric(5,2),
  rate_per_class    numeric(10,2),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint activity_coaches_pct_range
    check (revenue_share_pct is null or (revenue_share_pct >= 0 and revenue_share_pct <= 100)),
  constraint activity_coaches_amounts_positive
    check ((monthly_fee is null or monthly_fee >= 0)
       and (rate_per_class is null or rate_per_class >= 0))
);

create unique index activity_coaches_uniq on public.activity_coaches (activity_id, coach_id);
create index activity_coaches_gym_idx on public.activity_coaches (gym_id);
create index activity_coaches_coach_idx on public.activity_coaches (coach_id);

create trigger activity_coaches_set_updated_at
  before update on public.activity_coaches
  for each row execute function public.set_updated_at();

alter table public.activity_coaches enable row level security;

-- SELECT: cualquier miembro del gym (el coach necesita ver sus asignaciones; el
-- socio, quién dicta la actividad) + super_admin.
create policy activity_coaches_select on public.activity_coaches
  for select using (
    gym_id in (select public.auth_gym_ids()) or public.is_super_admin()
  );

-- WRITE: solo admin/owner (define costos → decisión comercial).
create policy activity_coaches_admin_write on public.activity_coaches
  for all using (public.is_admin_of(gym_id))
  with check (public.is_admin_of(gym_id));

-- Backfill del coach único existente (sin esquema de pago: se completa en la UI)
-- y baja de la columna: la fuente de verdad del coach pasa a ser esta tabla.
insert into public.activity_coaches (gym_id, activity_id, coach_id)
select gym_id, id, coach_id
from public.activities
where coach_id is not null;

drop index if exists public.activities_coach_id_idx;
alter table public.activities drop column coach_id;
