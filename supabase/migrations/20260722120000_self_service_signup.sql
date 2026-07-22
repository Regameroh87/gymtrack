-- Signup self-service de gimnasios.
-- El dueño crea su propio gym desde /registro (web) vía la edge function
-- crear-gym-self-service y arranca en 'trialing' SIN tarjeta (el checkout de MP
-- se ofrece desde el panel antes de que venza el trial).
--
-- Piezas:
--   1. gyms.created_via: distingue alta de plataforma vs self-service
--   2. platform_settings: kill switch runtime (arranca CERRADO)
--   3. self_service_signup_attempts: rate limiting por IP (solo service_role)
--   4. Fix cron expire-saas-trials: expira también checkouts abandonados
--   5. Cron suspend-expired-self-service: suspende gyms expirados hace 30d

-- ── 1. Origen del gym ────────────────────────────────────────────────────────

alter table public.gyms
  add column if not exists created_via text not null default 'platform'
    check (created_via in ('platform','self_service'));

-- ── 2. Kill switch de plataforma ─────────────────────────────────────────────
-- Fila única. La landing y /registro lo leen sin sesión (anon); solo el
-- super_admin lo togglea desde platform/billing. Arranca en false: el
-- super_admin abre los registros cuando quiera.

create table public.platform_settings (
  id                           boolean primary key default true check (id),
  self_service_signup_enabled  boolean not null default false,
  updated_at                   timestamptz not null default now()
);

create trigger platform_settings_set_updated_at
  before update on public.platform_settings
  for each row execute function public.set_updated_at();

insert into public.platform_settings default values;

alter table public.platform_settings enable row level security;

create policy platform_settings_select on public.platform_settings
  for select to anon, authenticated
  using (true);

-- is_platform_admin() devuelve NULL sin profile → siempre comparar con `is true`.
create policy platform_settings_update on public.platform_settings
  for update to authenticated
  using (public.is_platform_admin() is true)
  with check (public.is_platform_admin() is true);

grant select on public.platform_settings to anon, authenticated;
grant update on public.platform_settings to authenticated;
grant all on public.platform_settings to service_role;

-- ── 3. Rate limiting por IP ──────────────────────────────────────────────────
-- Solo la edge function (service_role) lee/escribe: RLS sin policies.

create table public.self_service_signup_attempts (
  id          uuid primary key default gen_random_uuid(),
  ip          text not null,
  user_id     uuid,
  gym_id      uuid,
  created_at  timestamptz not null default now()
);

create index self_service_signup_attempts_ip_idx
  on public.self_service_signup_attempts (ip, created_at desc);

alter table public.self_service_signup_attempts enable row level security;

grant all on public.self_service_signup_attempts to service_role;

-- ── 4. Fix cron expire-saas-trials ───────────────────────────────────────────
-- El original exigía mp_preapproval_id IS NULL, pero el checkout guarda el id
-- ANTES de que el owner autorice en MP: un checkout abandonado quedaba
-- 'trialing' para siempre. Ahora también expira trials con preapproval_id
-- seteado 3 días después de trial_ends_at (margen para demoras del
-- authorized_payment de MP; si el pago llega, el webhook ya lo pasó a active).

select cron.unschedule('expire-saas-trials')
where exists (select 1 from cron.job where jobname = 'expire-saas-trials');

select cron.schedule(
  'expire-saas-trials',
  '0 * * * *',
  $cron$
    update public.gym_saas_subscriptions
       set status = 'expired', updated_at = now()
     where status = 'trialing'
       and ( (trial_ends_at < now() and mp_preapproval_id is null)
          or  trial_ends_at < now() - interval '3 days' );
  $cron$
);

-- ── 5. Cron: suspender gyms self-service expirados ───────────────────────────
-- Un gym self-service cuyo trial expiró sin que nunca cargara tarjeta y que
-- lleva 30 días así se suspende (is_active = false → desaparece del selector y
-- del sitio público). NO se borra: el hard-delete (media/storage en cascada)
-- queda como acción manual del super_admin vía eliminar-gym.
-- De paso limpia los intentos de signup viejos del rate limiting.

select cron.unschedule('suspend-expired-self-service')
where exists (select 1 from cron.job where jobname = 'suspend-expired-self-service');

select cron.schedule(
  'suspend-expired-self-service',
  '45 0 * * *',
  $cron$
    update public.gyms g
       set is_active = false
      from public.gym_saas_subscriptions s
     where s.gym_id = g.id
       and g.created_via = 'self_service'
       and g.is_active
       and s.status = 'expired'
       and s.mp_preapproval_id is null
       and s.updated_at < now() - interval '30 days';

    delete from public.self_service_signup_attempts
     where created_at < now() - interval '7 days';
  $cron$
);
