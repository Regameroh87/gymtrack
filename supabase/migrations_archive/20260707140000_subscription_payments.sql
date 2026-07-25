-- Registro real de cobros de socios. Hasta ahora "registrar pago" solo movía
-- due_date/last_payment_date en activity_subscriptions: no quedaba fila del
-- cobro, así que era imposible calcular con precisión el % de ingresos que le
-- corresponde a un coach. Cada cobro pasa a ser una fila acá; de paso habilita
-- reportes de ingresos reales por período. Sin backfill: los períodos previos
-- al rollout no tienen datos.
--
-- Entidad ONLINE (panel admin): no entra al sync offline.

create table public.subscription_payments (
  id              uuid primary key default gen_random_uuid(),
  gym_id          uuid not null references public.gyms(id) on delete cascade,
  subscription_id uuid not null references public.activity_subscriptions(id) on delete cascade,
  activity_id     uuid not null references public.activities(id) on delete cascade, -- denormalizado: % por actividad
  user_id         uuid not null references public.profiles(id) on delete cascade,   -- el socio
  amount          numeric(10,2) not null check (amount >= 0),
  paid_at         date not null default current_date,
  registered_by   uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index subscription_payments_gym_paid_idx
  on public.subscription_payments (gym_id, paid_at);
create index subscription_payments_activity_paid_idx
  on public.subscription_payments (activity_id, paid_at);
create index subscription_payments_subscription_idx
  on public.subscription_payments (subscription_id);
create index subscription_payments_user_idx
  on public.subscription_payments (user_id);

alter table public.subscription_payments enable row level security;

-- SELECT: el socio ve sus cobros; el staff del gym, todos.
create policy subscription_payments_select on public.subscription_payments
  for select using (
    user_id = public.auth_profile_id() or public.is_staff_of(gym_id)
  );

-- WRITE: solo admin/owner (cobranza manual).
create policy subscription_payments_admin_write on public.subscription_payments
  for all using (public.is_admin_of(gym_id))
  with check (public.is_admin_of(gym_id));

-- RPC atómico: inserta el cobro Y mueve el vencimiento en una transacción, para
-- que la caja y el estado "al día" no puedan divergir.
create or replace function public.register_subscription_payment(
  p_subscription_id uuid,
  p_amount          numeric default null,  -- null ⇒ precio snapshot de la suscripción
  p_next_due_date   date default null      -- null ⇒ un mes desde hoy
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sub        public.activity_subscriptions%rowtype;
  v_payment_id uuid;
begin
  select * into v_sub
  from public.activity_subscriptions
  where id = p_subscription_id;

  if not found then
    raise exception 'Suscripción inexistente';
  end if;
  if not public.is_admin_of(v_sub.gym_id) then
    raise exception 'No autorizado';
  end if;

  insert into public.subscription_payments
    (gym_id, subscription_id, activity_id, user_id, amount, registered_by)
  values
    (v_sub.gym_id, v_sub.id, v_sub.activity_id, v_sub.user_id,
     coalesce(p_amount, v_sub.price, 0), public.auth_profile_id())
  returning id into v_payment_id;

  update public.activity_subscriptions
  set last_payment_date = current_date,
      due_date = coalesce(p_next_due_date, (current_date + interval '1 month')::date)
  where id = v_sub.id;

  return v_payment_id;
end;
$$;
