-- Sistema de suscripción SaaS: el gym owner paga para usar GymTrack.
-- Fase 1: schema (3 tablas) + helper is_saas_subscription_active + gating DB via
-- políticas RESTRICTIVE en todas las tablas mutables con gym_id.
--
-- Semántica de estados:
--   pending   → gym creado, esperando que el owner complete el checkout de MP
--   trialing  → preapproval autorizado, dentro del período de trial
--   active    → suscripción al día (cobro recurrente exitoso)
--   past_due  → último cobro falló, en período de gracia
--   canceled  → owner canceló la suscripción
--   expired   → trial terminó sin preapproval, o grace period superado
--
-- Compatibilidad hacia atrás: gyms SIN fila en gym_saas_subscriptions (creados
-- antes de este sistema) reciben acceso total → is_saas_subscription_active devuelve true.

-- ── 1. Catálogo de planes ────────────────────────────────────────────────────

create table public.saas_plans (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  description            text,
  price                  numeric(10,2),          -- null = a configurar con MP
  currency               text not null default 'ARS',
  billing_period         text not null default 'monthly'
    check (billing_period in ('monthly','annual')),
  trial_days             int not null default 14,
  mp_preapproval_plan_id text,                   -- ID de plan en MercadoPago
  is_active              boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create trigger saas_plans_set_updated_at
  before update on public.saas_plans
  for each row execute function public.set_updated_at();

insert into public.saas_plans (name, description, trial_days)
values ('Pro', 'Plan de acceso completo a GymTrack', 14);

-- ── 2. Suscripciones por gym ─────────────────────────────────────────────────

create table public.gym_saas_subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  gym_id              uuid not null unique references public.gyms(id) on delete cascade,
  plan_id             uuid not null references public.saas_plans(id),
  status              text not null default 'pending'
    check (status in ('pending','trialing','active','past_due','canceled','expired')),
  mp_preapproval_id   text unique,               -- ID de preapproval en MP
  payer_email         text,
  trial_ends_at       timestamptz,
  current_period_end  timestamptz,
  canceled_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index gym_saas_subscriptions_status_idx
  on public.gym_saas_subscriptions (status, trial_ends_at);

create trigger gym_saas_subscriptions_set_updated_at
  before update on public.gym_saas_subscriptions
  for each row execute function public.set_updated_at();

-- ── 3. Log de eventos (auditoría + idempotencia de webhooks MP) ──────────────

create table public.saas_subscription_events (
  id                  uuid primary key default gen_random_uuid(),
  gym_subscription_id uuid references public.gym_saas_subscriptions(id) on delete cascade,
  mp_event_id         text unique,               -- idempotencia: no procesar dos veces
  event_type          text not null,             -- 'preapproval.updated', 'authorized_payment', …
  payload             jsonb,
  processed_at        timestamptz not null default now()
);

create index saas_subscription_events_sub_idx
  on public.saas_subscription_events (gym_subscription_id, processed_at desc);

-- ── 4. Helper: ¿puede el gym escribir datos? ─────────────────────────────────
-- Super admin siempre pasa. Gyms sin fila también (compat hacia atrás).

create or replace function public.is_saas_subscription_active(p_gym_id uuid)
returns boolean
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_status text;
begin
  if public.is_super_admin() is not true then
    select status into v_status
    from public.gym_saas_subscriptions
    where gym_id = p_gym_id;

    if found then
      return v_status in ('trialing', 'active');
    end if;
  end if;
  return true;
end;
$$;

-- ── 5. Políticas RESTRICTIVE de escritura ────────────────────────────────────
-- Patrón por tabla: 3 políticas (INSERT / UPDATE / DELETE).
-- SELECT nunca se toca → reads siempre libres → modo read-only funciona.

-- memberships
create policy saas_gate_memberships_ins on public.memberships
  as restrictive for insert
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_memberships_upd on public.memberships
  as restrictive for update
  using (public.is_saas_subscription_active(gym_id))
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_memberships_del on public.memberships
  as restrictive for delete
  using (public.is_saas_subscription_active(gym_id));

-- activities
create policy saas_gate_activities_ins on public.activities
  as restrictive for insert
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_activities_upd on public.activities
  as restrictive for update
  using (public.is_saas_subscription_active(gym_id))
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_activities_del on public.activities
  as restrictive for delete
  using (public.is_saas_subscription_active(gym_id));

-- activity_plans (gym_id vía activity_id → activities.gym_id)
create policy saas_gate_activity_plans_ins on public.activity_plans
  as restrictive for insert
  with check (
    public.is_saas_subscription_active(
      (select a.gym_id from public.activities a where a.id = activity_id)
    )
  );
create policy saas_gate_activity_plans_upd on public.activity_plans
  as restrictive for update
  using (
    public.is_saas_subscription_active(
      (select a.gym_id from public.activities a where a.id = activity_id)
    )
  )
  with check (
    public.is_saas_subscription_active(
      (select a.gym_id from public.activities a where a.id = activity_id)
    )
  );
create policy saas_gate_activity_plans_del on public.activity_plans
  as restrictive for delete
  using (
    public.is_saas_subscription_active(
      (select a.gym_id from public.activities a where a.id = activity_id)
    )
  );

-- activity_subscriptions
create policy saas_gate_activity_subs_ins on public.activity_subscriptions
  as restrictive for insert
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_activity_subs_upd on public.activity_subscriptions
  as restrictive for update
  using (public.is_saas_subscription_active(gym_id))
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_activity_subs_del on public.activity_subscriptions
  as restrictive for delete
  using (public.is_saas_subscription_active(gym_id));

-- subscription_payments
create policy saas_gate_sub_payments_ins on public.subscription_payments
  as restrictive for insert
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_sub_payments_upd on public.subscription_payments
  as restrictive for update
  using (public.is_saas_subscription_active(gym_id))
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_sub_payments_del on public.subscription_payments
  as restrictive for delete
  using (public.is_saas_subscription_active(gym_id));

-- attendances
create policy saas_gate_attendances_ins on public.attendances
  as restrictive for insert
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_attendances_upd on public.attendances
  as restrictive for update
  using (public.is_saas_subscription_active(gym_id))
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_attendances_del on public.attendances
  as restrictive for delete
  using (public.is_saas_subscription_active(gym_id));

-- equipment
create policy saas_gate_equipment_ins on public.equipment
  as restrictive for insert
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_equipment_upd on public.equipment
  as restrictive for update
  using (public.is_saas_subscription_active(gym_id))
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_equipment_del on public.equipment
  as restrictive for delete
  using (public.is_saas_subscription_active(gym_id));

-- sessions (clases de entrenamiento)
create policy saas_gate_sessions_ins on public.sessions
  as restrictive for insert
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_sessions_upd on public.sessions
  as restrictive for update
  using (public.is_saas_subscription_active(gym_id))
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_sessions_del on public.sessions
  as restrictive for delete
  using (public.is_saas_subscription_active(gym_id));

-- training_plans
create policy saas_gate_training_plans_ins on public.training_plans
  as restrictive for insert
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_training_plans_upd on public.training_plans
  as restrictive for update
  using (public.is_saas_subscription_active(gym_id))
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_training_plans_del on public.training_plans
  as restrictive for delete
  using (public.is_saas_subscription_active(gym_id));

-- exercises_base (ejercicios personalizados del gym; catalog tiene gym_id NULL → no afectado)
create policy saas_gate_exercises_base_ins on public.exercises_base
  as restrictive for insert
  with check (
    gym_id is null or public.is_saas_subscription_active(gym_id)
  );
create policy saas_gate_exercises_base_upd on public.exercises_base
  as restrictive for update
  using (
    gym_id is null or public.is_saas_subscription_active(gym_id)
  )
  with check (
    gym_id is null or public.is_saas_subscription_active(gym_id)
  );
create policy saas_gate_exercises_base_del on public.exercises_base
  as restrictive for delete
  using (
    gym_id is null or public.is_saas_subscription_active(gym_id)
  );

-- activity_coaches
create policy saas_gate_activity_coaches_ins on public.activity_coaches
  as restrictive for insert
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_activity_coaches_upd on public.activity_coaches
  as restrictive for update
  using (public.is_saas_subscription_active(gym_id))
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_activity_coaches_del on public.activity_coaches
  as restrictive for delete
  using (public.is_saas_subscription_active(gym_id));

-- gym_qr_tokens
create policy saas_gate_gym_qr_tokens_ins on public.gym_qr_tokens
  as restrictive for insert
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_gym_qr_tokens_upd on public.gym_qr_tokens
  as restrictive for update
  using (public.is_saas_subscription_active(gym_id))
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_gym_qr_tokens_del on public.gym_qr_tokens
  as restrictive for delete
  using (public.is_saas_subscription_active(gym_id));

-- coach_payments
create policy saas_gate_coach_payments_ins on public.coach_payments
  as restrictive for insert
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_coach_payments_upd on public.coach_payments
  as restrictive for update
  using (public.is_saas_subscription_active(gym_id))
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_coach_payments_del on public.coach_payments
  as restrictive for delete
  using (public.is_saas_subscription_active(gym_id));

-- activity_schedules
create policy saas_gate_activity_schedules_ins on public.activity_schedules
  as restrictive for insert
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_activity_schedules_upd on public.activity_schedules
  as restrictive for update
  using (public.is_saas_subscription_active(gym_id))
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_activity_schedules_del on public.activity_schedules
  as restrictive for delete
  using (public.is_saas_subscription_active(gym_id));

-- activity_classes
create policy saas_gate_activity_classes_ins on public.activity_classes
  as restrictive for insert
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_activity_classes_upd on public.activity_classes
  as restrictive for update
  using (public.is_saas_subscription_active(gym_id))
  with check (public.is_saas_subscription_active(gym_id));
create policy saas_gate_activity_classes_del on public.activity_classes
  as restrictive for delete
  using (public.is_saas_subscription_active(gym_id));

-- membership_permissions (gym_id vía memberships.membership_id)
create policy saas_gate_membership_perms_ins on public.membership_permissions
  as restrictive for insert
  with check (
    public.is_saas_subscription_active(
      (select m.gym_id from public.memberships m where m.id = membership_id)
    )
  );
create policy saas_gate_membership_perms_upd on public.membership_permissions
  as restrictive for update
  using (
    public.is_saas_subscription_active(
      (select m.gym_id from public.memberships m where m.id = membership_id)
    )
  )
  with check (
    public.is_saas_subscription_active(
      (select m.gym_id from public.memberships m where m.id = membership_id)
    )
  );
create policy saas_gate_membership_perms_del on public.membership_permissions
  as restrictive for delete
  using (
    public.is_saas_subscription_active(
      (select m.gym_id from public.memberships m where m.id = membership_id)
    )
  );

-- ── 6. RLS en tablas nuevas ──────────────────────────────────────────────────

alter table public.saas_plans enable row level security;
alter table public.gym_saas_subscriptions enable row level security;
alter table public.saas_subscription_events enable row level security;

-- saas_plans: todo autenticado lee planes activos; solo super_admin escribe
create policy saas_plans_select on public.saas_plans
  for select to authenticated
  using (is_active = true);

create policy saas_plans_super_admin on public.saas_plans
  for all
  using (public.is_super_admin() is true)
  with check (public.is_super_admin() is true);

-- gym_saas_subscriptions: staff del gym lee la suya; super_admin gestiona todo
create policy gym_saas_sub_select on public.gym_saas_subscriptions
  for select
  using (
    public.is_staff_of(gym_id) or public.is_super_admin() is true
  );

create policy gym_saas_sub_super_admin on public.gym_saas_subscriptions
  for all
  using (public.is_super_admin() is true)
  with check (public.is_super_admin() is true);

-- saas_subscription_events: solo super_admin y service_role (bypass RLS)
create policy saas_events_super_admin on public.saas_subscription_events
  for all
  using (public.is_super_admin() is true)
  with check (public.is_super_admin() is true);

-- ── 7. Grants ────────────────────────────────────────────────────────────────
revoke all on function public.is_saas_subscription_active(uuid) from public, anon;
grant execute on function public.is_saas_subscription_active(uuid) to authenticated, service_role;

-- service_role escribe gym_saas_subscriptions y eventos desde el webhook (Fase 2)
grant all on public.saas_plans to service_role;
grant all on public.gym_saas_subscriptions to service_role;
grant all on public.saas_subscription_events to service_role;

-- ── 8. Cron: expirar trials sin preapproval ──────────────────────────────────
-- Cada hora marca expired los trials que pasaron trial_ends_at sin mp_preapproval_id.
-- Cuando MP confirme el preapproval, el webhook (Fase 2) los activa antes de que expire.

select cron.unschedule('expire-saas-trials')
where exists (select 1 from cron.job where jobname = 'expire-saas-trials');

select cron.schedule(
  'expire-saas-trials',
  '0 * * * *',
  $cron$
    update public.gym_saas_subscriptions
       set status = 'expired', updated_at = now()
     where status = 'trialing'
       and trial_ends_at < now()
       and mp_preapproval_id is null;
  $cron$
);
