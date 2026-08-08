-- Cobro manual de varios meses en una sola transacción.
--
-- register_subscription_payment (singular) cobra un mes. Con la deuda acumulada
-- (migración 20260803120100), un socio que debe tres meses y paga todo en
-- efectivo obligaba al staff a repetir la operación tres veces, y hasta que
-- terminara seguía figurando en deuda. Peor: si una de las tres fallaba, quedaba
-- plata cobrada y deuda a medio saldar, porque cada llamada es su propia
-- transacción.
--
-- Esta función cobra N meses consecutivos de una, atómica: o entran los N cobros
-- y el vencimiento queda N meses adelante, o no pasa nada.
--
-- POR QUÉ LOS MESES SON CONSECUTIVOS Y DESDE EL MÁS VIEJO
--
-- La deuda no se guarda en ningún lado: se deriva de la distancia entre due_date
-- y hoy. Y el vencimiento avanza con greatest(due_date, period_end). O sea que
-- cobrar un mes salteado — pagar agosto debiendo junio — empuja due_date a
-- septiembre y hace desaparecer junio y julio de member_pending_charges. No
-- quedan impagos: dejan de existir. Es plata que se borra sola y sin registro.
--
-- Por eso acá no se elige QUÉ meses se pagan sino CUÁNTOS: siempre arrancan en
-- el vencimiento actual y avanzan sin huecos. El singular sigue aceptando un
-- p_period_start arbitrario porque lo usa el caso legítimo de adelantar un pago
-- (un socio al día que paga el mes que viene), donde no hay nada que saltear.

create or replace function public.register_subscription_payments(
  p_subscription_id uuid,
  p_months          integer default 1,
  p_amount          numeric default null,
  p_payment_method  text    default null
)
returns uuid[]
language plpgsql
set search_path to 'public'
as $$
declare
  v_sub          public.activity_subscriptions%rowtype;
  v_first_period date;
  v_period_start date;
  v_period_end   date;
  v_amount       numeric;
  v_payment_id   uuid;
  v_ids          uuid[] := '{}';
  k              integer;
begin
  if p_months is null or p_months < 1 then
    raise exception 'Hay que cobrar al menos un mes';
  end if;
  -- Tope de cordura: un dedo pesado en el selector no puede generar cien cobros.
  -- Tres años es más de lo que cualquier deuda real justifica.
  if p_months > 36 then
    raise exception 'No se pueden cobrar más de 36 meses de una vez';
  end if;

  -- for update: dos personas del staff cobrando al mismo socio a la vez leerían
  -- el mismo due_date y cobrarían los mismos meses dos veces. El lock las serializa,
  -- y la segunda arranca desde el vencimiento ya movido por la primera.
  select * into v_sub
  from public.activity_subscriptions
  where id = p_subscription_id
  for update;

  if not found then
    raise exception 'Suscripción inexistente';
  end if;
  if not public.has_gym_permission(v_sub.gym_id, 'payments.register') then
    raise exception 'No autorizado';
  end if;

  v_first_period := date_trunc('month', coalesce(v_sub.due_date, current_date))::date;
  v_amount       := coalesce(p_amount, v_sub.price, 0);

  for k in 0 .. p_months - 1 loop
    v_period_start := (v_first_period + (k || ' months')::interval)::date;
    v_period_end   := (v_period_start + interval '1 month')::date;

    insert into public.subscription_payments
      (gym_id, subscription_id, activity_id, user_id, amount,
       period_start, period_end, payment_method, registered_by)
    values
      (v_sub.gym_id, v_sub.id, v_sub.activity_id, v_sub.user_id, v_amount,
       v_period_start, v_period_end, p_payment_method, public.auth_profile_id())
    returning id into v_payment_id;

    v_ids := v_ids || v_payment_id;
  end loop;

  -- Un solo update al final, con el vencimiento del último mes cobrado. El
  -- greatest se mantiene por la misma razón que en el singular: nunca retroceder
  -- un vencimiento ya ganado.
  update public.activity_subscriptions
  set last_payment_date = current_date,
      due_date = greatest(v_sub.due_date, v_period_end)
  where id = v_sub.id;

  return v_ids;
end;
$$;

comment on function public.register_subscription_payments(uuid, integer, numeric, text) is
  'Cobra N meses consecutivos de una suscripción en una transacción, arrancando en el vencimiento actual. Devuelve los ids de los cobros. Los meses son consecutivos a propósito: saltear uno lo haría desaparecer de la deuda, que se deriva de due_date.';

grant execute on function public.register_subscription_payments(uuid, integer, numeric, text)
  to authenticated, service_role;
