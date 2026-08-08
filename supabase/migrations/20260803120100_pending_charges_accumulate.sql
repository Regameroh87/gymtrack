-- member_pending_charges: una fila por mes impago, no una por actividad.
--
-- Hasta ahora la función devolvía UNA fila por suscripción vencida, con el
-- precio de UN mes, sin importar cuánto hacía que el socio no pagaba. Un socio
-- que no pagaba desde enero, en abril, figuraba debiendo un mes. El sistema
-- directamente no acumulaba deuda: ni el mail de cobranza, ni el checkout de
-- MercadoPago, ni la pantalla del socio en la app mostraban el saldo real.
--
-- El modelo sí tiene la información: activity_subscriptions.due_date es la fecha
-- hasta la que pagó, y cada pago la mueve un mes (register_subscription_payment:
-- due_date = greatest(due_date, period_end)). O sea que los meses adeudados son
-- los que hay entre due_date y hoy — no hace falta una tabla nueva, alcanza con
-- expandir esa distancia.
--
-- REQUIERE la migración 20260803120000 aplicada antes: sin el unique nuevo de
-- member_payment_intent_items, el checkout falla al insertar dos meses de la
-- misma suscripción.
--
-- El resto de la cadena ya soportaba esto sin cambios, y se verificó uno por
-- uno: crear-cobro-socio arma un item de MercadoPago por fila, el intento
-- congela cada período en member_payment_intent_items, y
-- register_member_online_payment inserta un subscription_payments por item y
-- adelanta el vencimiento con greatest(due_date, period_end) en cada vuelta —
-- con lo cual pagar tres meses deja el vencimiento tres meses adelante. La firma
-- y el tipo de retorno no cambian, así que es un create or replace: no hay que
-- dropear nada ni cae en cascada gym_dunning_candidates.

create or replace function public.member_pending_charges(
  p_gym_id  uuid,
  p_user_id uuid
)
returns table (
  subscription_id uuid,
  activity_id     uuid,
  activity_name   text,
  plan_label      text,
  amount          numeric(10,2),
  period_start    date,
  period_end      date
)
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  select
    s.id,
    s.activity_id,
    a.name,
    p.label,
    coalesce(s.price, p.price, 0)::numeric(10,2),
    date_trunc('month', venc)::date,
    (date_trunc('month', venc) + interval '1 month')::date
  from public.activity_subscriptions s
  join public.activities a on a.id = s.activity_id
  left join public.activity_plans p on p.id = s.activity_plan_id
  -- Un vencimiento por mes, sobre la fecha REAL, y recién después se trunca a
  -- mes para el período contable (que es la convención del resto del esquema:
  -- subscription_payments.period_start, el desglose del checkout, los informes
  -- de ingresos).
  --
  -- El orden importa y es fácil errarlo: truncando ANTES, la serie llega hasta
  -- date_trunc('month', current_date) y cobra el mes en curso aunque su
  -- vencimiento todavía no haya llegado. Un socio que vence los 10 y debe desde
  -- junio, mirado un 3 de agosto, tiene que deber junio y julio — no agosto, que
  -- vence recién en una semana. Generando sobre la fecha real, la serie se corta
  -- sola en el último vencimiento que ya pasó.
  --
  -- Sin due_date la serie da una sola vuelta (hoy → mes en curso), que es
  -- exactamente lo que devolvía la versión anterior para ese caso.
  cross join lateral generate_series(
    coalesce(s.due_date, current_date),
    current_date,
    interval '1 month'
  ) as venc
  where s.gym_id = p_gym_id
    and s.user_id = p_user_id
    and s.status = 'active'
    and (s.due_date is null or s.due_date <= current_date)
  order by a.name, venc;
$$;

comment on function public.member_pending_charges(uuid, uuid) is
  'Cuotas que un socio debe en un gym, una fila por actividad y mes impago. Es la definición única de "lo que hay que cobrarle": la usan /api/gym-mp/cobro, la app del socio y la cobranza automática. Acumula: un socio con tres meses sin pagar devuelve tres filas y el total es el saldo real.';
