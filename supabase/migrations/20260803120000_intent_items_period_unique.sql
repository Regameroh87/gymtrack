-- Un intento de pago puede tener VARIOS meses de la misma suscripción.
--
-- Hasta ahora el unique era (intent_id, subscription_id): un item por
-- suscripción y listo, porque member_pending_charges devolvía una sola fila por
-- actividad con el precio de un mes. Con la deuda acumulada (migración
-- 20260803120100) esa misma suscripción pasa a aportar una fila por mes impago,
-- y el insert de member_payment_intent_items moriría con clave duplicada — o
-- sea, el socio no podría pagar.
--
-- ESTA MIGRACIÓN VA ANTES QUE LA QUE EXPANDE member_pending_charges. Al revés
-- rompe el cobro online en el intervalo entre las dos. Son archivos separados
-- justamente para que el orden sea explícito y no dependa de dónde caiga cada
-- statement dentro de una misma transacción.
--
-- El período sigue siendo lo que identifica al item: dos filas de la misma
-- suscripción en el mismo intento tienen que ser meses distintos. Sin
-- period_start en la clave, un bug que duplicara un mes pasaría desapercibido y
-- le cobraría dos veces lo mismo al socio.

alter table public.member_payment_intent_items
  drop constraint if exists member_payment_intent_items_intent_id_subscription_id_key;

alter table public.member_payment_intent_items
  add constraint member_payment_intent_items_intent_sub_period_key
    unique (intent_id, subscription_id, period_start);

comment on constraint member_payment_intent_items_intent_sub_period_key
  on public.member_payment_intent_items is
  'Un item por suscripción y período. Permite saldar varios meses atrasados en un mismo pago, sin dejar que se cuele el mismo mes dos veces.';
