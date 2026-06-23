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
