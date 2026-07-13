-- Registrar el método de pago del cobro. El frontend (pestaña "Pagos recibidos")
-- ya envía payment_method al RPC y lo filtra/muestra, pero ninguna migración
-- había agregado la columna ni el parámetro: el registro de pagos quedaba roto
-- en producción (el RPC no aceptaba p_payment_method). Sin backfill: los cobros
-- previos al rollout quedan con payment_method null (la UI muestra "—").

alter table public.subscription_payments
  add column payment_method text
    check (payment_method in ('efectivo', 'transferencia', 'tarjeta', 'mercado_pago'));

comment on column public.subscription_payments.payment_method is
  'Cómo se cobró. Null en filas previas al rollout.';

-- El 4to parámetro es nuevo → hay que dropear la firma vieja antes de recrear.
drop function if exists public.register_subscription_payment(uuid, numeric, date);

create or replace function public.register_subscription_payment(
  p_subscription_id uuid,
  p_amount          numeric default null, -- null ⇒ precio snapshot de la suscripción
  p_period_start    date    default null, -- mes a pagar (primer día); null ⇒ mes del vencimiento actual
  p_payment_method  text    default null
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sub          public.activity_subscriptions%rowtype;
  v_period_start date;
  v_period_end   date;
  v_payment_id   uuid;
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

  -- Mes que se paga: el elegido, o por defecto el del vencimiento actual (o el
  -- mes en curso si la suscripción no tiene vencimiento).
  v_period_start := date_trunc(
    'month',
    coalesce(p_period_start, v_sub.due_date, current_date)
  )::date;
  v_period_end := (v_period_start + interval '1 month')::date;

  insert into public.subscription_payments
    (gym_id, subscription_id, activity_id, user_id, amount,
     period_start, period_end, payment_method, registered_by)
  values
    (v_sub.gym_id, v_sub.id, v_sub.activity_id, v_sub.user_id,
     coalesce(p_amount, v_sub.price, 0),
     v_period_start, v_period_end, p_payment_method, public.auth_profile_id())
  returning id into v_payment_id;

  update public.activity_subscriptions
  set last_payment_date = current_date,
      -- Nunca retrocede el vencimiento (greatest ignora null): cobrar un mes
      -- atrasado no debe adelantar la fecha de un socio que ya iba adelantado.
      due_date = greatest(v_sub.due_date, v_period_end)
  where id = v_sub.id;

  return v_payment_id;
end;
$$;
