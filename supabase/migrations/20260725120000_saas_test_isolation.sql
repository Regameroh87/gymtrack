-- Aislamiento del vendedor de prueba de MercadoPago.
--
-- El webhook atiende dos apps de MP (la real y la del vendedor de prueba) sobre
-- la MISMA base. Hasta ahora `isTest` solo servía para elegir credenciales y
-- para el log: no restringía qué fila podía escribir. Un aviso del sandbox
-- entonces podía mutar la suscripción de un gym real, y eso fue exactamente lo
-- que pasó el 2026-07-24 (tres avisos de la app de prueba dejaron la fila en
-- 'trialing' con un trial vencido, y la baja se comió el mes ya pagado).
--
-- Se trazan dos límites distintos y complementarios:
--
--   mp_application_id → integridad: una fila pertenece a la app que la creó, y
--     un aviso de otra app se descarta. Es lo que habría evitado la corrupción.
--
--   gyms.is_test → alcance: el sandbox solo puede tocar gyms marcados como de
--     prueba. Cubre lo que el anterior no: estrenar una suscripción de sandbox
--     sobre un gym real que todavía no tenía ninguna.

alter table public.gym_saas_subscriptions
  add column if not exists mp_application_id text;

comment on column public.gym_saas_subscriptions.mp_application_id is
  'App de MP que creó el preapproval. El webhook descarta avisos de otra app. NULL = fila anterior a esta columna; la reclama el primer aviso que llegue.';

alter table public.gyms
  add column if not exists is_test boolean not null default false;

comment on column public.gyms.is_test is
  'Gym de prueba: la única clase de gym que los avisos del vendedor de prueba de MP pueden tocar.';
