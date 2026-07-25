-- ── mp_authorized_at ─────────────────────────────────────────────────────────
-- Cuándo MP confirmó que el preapproval VIGENTE quedó 'authorized', o sea con
-- tarjeta adherida y débito programado.
--
-- Hasta acá se usaba `mp_preapproval_id is not null` como proxy de "ya cargó la
-- tarjeta", y no lo es: ese id lo escribe el checkout al CREAR el preapproval —
-- al apretar el botón — mucho antes de que el owner autorice nada en MP. Un
-- checkout abandonado dejaba el id escrito y el gym en trial se quedaba sin
-- poder cargar la tarjeta hasta que venciera la prueba: el botón "Agregar
-- método de pago" desaparecía para siempre. El mismo proxy roto ya había
-- obligado a parchear el cron expire-saas-trials (ver 20260722120000).
--
-- SEMÁNTICA: es del preapproval vigente, NO del gym. El checkout lo vuelve a
-- NULL cada vez que crea uno nuevo y el webhook lo setea al recibir
-- 'authorized'. NO sirve para preguntar "este gym alguna vez cargó tarjeta":
-- eso lo mira suspend-expired-self-service, que sigue con el proxy viejo a
-- propósito porque necesita el otro significado.

alter table public.gym_saas_subscriptions
  add column if not exists mp_authorized_at timestamptz;

comment on column public.gym_saas_subscriptions.mp_authorized_at is
  'Cuándo MP confirmó ''authorized'' el preapproval vigente. NULL = checkout creado pero sin autorizar (o sin checkout). Lo resetea /api/saas/checkout al crear un preapproval nuevo; lo escribe el webhook mp-webhook.';

-- ── Backfill ─────────────────────────────────────────────────────────────────
-- Solo donde el dato es seguro:
--   active / past_due    → hubo cobro o intento de cobro, así que hubo
--                          autorización sí o sí.
--   current_period_end   → idem: lo escribe el handler de authorized_payment,
--                          o sea recién cuando MP cobró de verdad.
--
-- Los 'trialing' quedan en NULL a propósito. Desde SQL no hay forma de saber si
-- su preapproval está authorized en MP, y marcarlos "autorizados" por las dudas
-- reproduciría exactamente el bug que esto viene a arreglar. El caso lo resuelve
-- el checkout, que ante un trialing con preapproval sin confirmar le pregunta a
-- MP antes de dejar crear otro (guarda cobrandoAhora) y de paso repara la fila.
--
-- El trigger se apaga durante el backfill: set_updated_at pisaría updated_at con
-- now() en cada fila tocada, y esa columna es la que miran expire-saas-past-due
-- y suspend-expired-self-service para contar sus 30 días. Sin esto, el backfill
-- les regalaría un mes a todos.

alter table public.gym_saas_subscriptions
  disable trigger gym_saas_subscriptions_set_updated_at;

update public.gym_saas_subscriptions
   set mp_authorized_at = updated_at
 where mp_authorized_at is null
   and mp_preapproval_id is not null
   and (status in ('active', 'past_due') or current_period_end is not null);

alter table public.gym_saas_subscriptions
  enable trigger gym_saas_subscriptions_set_updated_at;
