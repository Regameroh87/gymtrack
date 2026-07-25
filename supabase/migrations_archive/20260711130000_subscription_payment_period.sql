-- Detalle del período que cubre cada cobro. Hasta ahora subscription_payments
-- guardaba monto y paid_at (cuándo se cobró) pero no QUÉ mes cubría, así que el
-- admin no tenía forma de saber/controlar qué mes pagó cada socio. Se agrega el
-- período cubierto (un mes por cobro) y el RPC pasa a aceptar el mes a pagar,
-- para poder cobrar meses atrasados o adelantar. Sin backfill: las filas previas
-- al rollout quedan con period_start/period_end en null (la UI muestra "—").

alter table public.subscription_payments
  add column period_start date,  -- primer día del mes que cubre el cobro
  add column period_end   date;  -- primer día del mes siguiente (fin del período)

comment on column public.subscription_payments.period_start is
  'Primer día del mes cubierto por el cobro. Null en filas previas al rollout.';
comment on column public.subscription_payments.period_end is
  'Primer día del mes siguiente al cubierto (= vencimiento del período). Null en filas previas.';

-- El 3er parámetro pasa de p_next_due_date a p_period_start (mismo tipo, distinto
-- nombre) → hay que dropear la firma vieja antes de recrear.
drop function if exists public.register_subscription_payment(uuid, numeric, date);

-- RPC atómico: inserta el cobro (con el mes que cubre) Y mueve el vencimiento en
-- una transacción, para que la caja y el estado "al día" no puedan divergir.
create or replace function public.register_subscription_payment(
  p_subscription_id uuid,
  p_amount          numeric default null, -- null ⇒ precio snapshot de la suscripción
  p_period_start    date    default null  -- mes a pagar (primer día); null ⇒ mes del vencimiento actual
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
     period_start, period_end, registered_by)
  values
    (v_sub.gym_id, v_sub.id, v_sub.activity_id, v_sub.user_id,
     coalesce(p_amount, v_sub.price, 0),
     v_period_start, v_period_end, public.auth_profile_id())
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
