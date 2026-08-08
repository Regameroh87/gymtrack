-- El preapproval de un cambio de plan espera en su propia columna.
--
-- Primer intento: el checkout de un cambio de plan pisaba mp_preapproval_id con
-- el preapproval nuevo y dejaba el plan destino en pending_plan_id. Rompía el
-- cobro del plan viejo, que es el que sigue debitando hasta que el owner
-- autorice: handleAuthorizedPaymentEvent (mp-webhook) resuelve la suscripción
-- SOLO por mp_preapproval_id y sin fallback por external_reference, así que el
-- pago mensual del preapproval viejo no encontraba la fila y current_period_end
-- se quedaba clavado. El owner pagaba y el sistema no se enteraba.
--
-- Ahora el preapproval nuevo espera acá y mp_preapproval_id sigue apuntando al
-- que realmente cobra. El webhook lo busca por esta columna y recién con el
-- 'authorized' de MP promueve las dos: pending_preapproval_id → mp_preapproval_id
-- y pending_plan_id → plan_id.
ALTER TABLE "public"."gym_saas_subscriptions"
  ADD COLUMN IF NOT EXISTS "pending_preapproval_id" "text";

COMMENT ON COLUMN "public"."gym_saas_subscriptions"."pending_preapproval_id" IS
  'Preapproval del cambio de plan todavía no autorizado en MercadoPago. Mientras tanto mp_preapproval_id sigue siendo el que cobra. Lo promueve el webhook con el authorized; lo limpia el reaper si el checkout se abandona.';

-- Se busca por esta columna en cada aviso de preapproval que no matchee el
-- vigente, así que conviene indexada. Parcial: la enorme mayoría de las filas
-- la tiene en NULL.
CREATE INDEX IF NOT EXISTS "gym_saas_subs_pending_preapproval_idx"
  ON "public"."gym_saas_subscriptions" ("pending_preapproval_id")
  WHERE "pending_preapproval_id" IS NOT NULL;
